const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Where birthday data is stored. On Render, mount a persistent disk to this
// directory (see README) so data survives restarts/redeploys.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'birthdays.json');

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const PALETTE_SIZE = 6;

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

function readAll() {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function writeAll(list) {
  ensureStore();
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));
}

function nextId(list) {
  return list.length ? Math.max(...list.map((p) => p.id)) + 1 : 1;
}

function isValidEntry(name, month, day) {
  if (typeof name !== 'string' || !name.trim() || name.length > 60) return false;
  if (!Number.isInteger(month) || month < 0 || month > 11) return false;
  if (!Number.isInteger(day) || day < 1 || day > DAYS_IN_MONTH[month]) return false;
  return true;
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- API ---

app.get('/api/birthdays', (req, res) => {
  res.json(readAll());
});

app.post('/api/birthdays', (req, res) => {
  const { name, month, day } = req.body || {};
  if (!isValidEntry(name, month, day)) {
    return res.status(400).json({ error: 'Invalid name, month, or day.' });
  }
  const list = readAll();
  const entry = {
    id: nextId(list),
    name: name.trim(),
    month,
    day,
    colorIdx: list.length % PALETTE_SIZE,
  };
  list.push(entry);
  writeAll(list);
  res.status(201).json(entry);
});

app.delete('/api/birthdays/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const list = readAll();
  const next = list.filter((p) => p.id !== id);
  if (next.length === list.length) {
    return res.status(404).json({ error: 'Not found.' });
  }
  writeAll(next);
  res.status(204).end();
});

// --- Live calendar feed (subscribable via webcal:// or https://) ---

function pad2(n) {
  return String(n).padStart(2, '0');
}

function icsDateFor(month, day) {
  const now = new Date();
  let y = now.getFullYear();
  const thisYear = new Date(y, month, day);
  const todayStart = new Date(y, now.getMonth(), now.getDate());
  if (thisYear < todayStart) y += 1;
  return `${y}${pad2(month + 1)}${pad2(day)}`;
}

function stampNow() {
  const d = new Date();
  return `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}T${pad2(
    d.getUTCHours()
  )}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`;
}

function escapeICS(str) {
  return String(str).replace(/[\\;,]/g, (m) => '\\' + m);
}

function buildICS(list) {
  const stamp = stampNow();
  const events = list.map((p) => {
    const start = icsDateFor(p.month, p.day);
    const y = parseInt(start.slice(0, 4), 10);
    const endDate = new Date(y, p.month, p.day + 1);
    const end = `${endDate.getFullYear()}${pad2(endDate.getMonth() + 1)}${pad2(endDate.getDate())}`;
    return [
      'BEGIN:VEVENT',
      `UID:birthday-${p.id}@team-birthdays`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      'RRULE:FREQ=YEARLY',
      `SUMMARY:${escapeICS(p.name)}'s birthday`,
      'END:VEVENT',
    ].join('\r\n');
  });
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Team Birthdays//Candy Calendar//EN',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:Team Birthdays',
    'REFRESH-INTERVAL;VALUE=DURATION:P1D',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

app.get('/api/birthdays.ics', (req, res) => {
  const list = readAll();
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="team-birthdays.ics"');
  res.send(buildICS(list));
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Team birthdays server running on port ${PORT}`);
});
