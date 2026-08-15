# Team Birthdays

A shared team birthday calendar: a pastel "candy calendar" dashboard, plus a
live `.ics` calendar feed people can subscribe to in Google/Outlook/Apple
Calendar.

Everyone who visits the deployed site sees the same shared list — birthdays
are stored server-side, not in each visitor's browser.

## What's inside

- `server.js` — a small Express server. Serves the frontend and a JSON API
  (`/api/birthdays`) plus a live calendar feed (`/api/birthdays.ics`).
- `public/index.html` — the frontend (single file, no build step).
- `data/birthdays.json` — where birthdays are stored (created automatically).

## Run it locally

Requires [Node.js](https://nodejs.org) 18+.

```bash
npm install
npm start
```

Then open **http://localhost:3000**.

## Deploy it (recommended: Render)

[Render](https://render.com) is a good fit here because it runs a real
Node process (not just serverless functions), so the file-based storage in
this app works without any extra setup, and it has a free tier.

1. Push this folder to a new GitHub repository.
2. Go to [render.com](https://render.com) → **New** → **Web Service** →
   connect your repo.
3. Render should auto-detect Node. If asked, use:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
4. Click **Create Web Service**. Render will give you a live URL like
   `https://team-birthdays.onrender.com`.

### Making the data persist long-term (important)

By default, Render's free web services use a temporary filesystem — your
`data/birthdays.json` file can be wiped on redeploy or after periods of
inactivity. To keep birthdays permanently:

- **Easiest fix:** on Render, upgrade the service to a paid instance type and
  add a **Persistent Disk** (Dashboard → your service → *Disks* → *Add Disk*),
  mounted at `/opt/render/project/src/data`. Set the environment variable
  `DATA_DIR=/opt/render/project/src/data` in the service settings. Now data
  survives restarts and redeploys.
- **Free alternative:** deploy to [Railway](https://railway.app) or
  [Fly.io](https://fly.io) instead — both offer a small persistent volume on
  their free/hobby tiers. Mount the volume and set `DATA_DIR` to point at it,
  same as above.

Without one of these, treat the free deployment as a demo — great for trying
it out and sharing the link, just don't rely on it as the permanent home for
your team's birthdays until persistent storage is attached.

## Using it

- Anyone who opens the site can add a teammate (name + month + day) — it's
  shared instantly with everyone else who visits.
- **Download .ics file** grabs a one-time snapshot to import into a calendar
  app.
- **Subscribe URL** (`/api/birthdays.ics`) can be pasted into Google Calendar
  ("Other calendars" → "From URL") or Outlook/Apple Calendar as a
  subscription — it'll automatically stay in sync as people are added.

## API reference

| Method | Path                  | Description                          |
|--------|-----------------------|---------------------------------------|
| GET    | `/api/birthdays`      | List all birthdays                    |
| POST   | `/api/birthdays`      | Add one — body: `{ name, month, day }` (`month` is 0–11) |
| DELETE | `/api/birthdays/:id`  | Remove one                            |
| GET    | `/api/birthdays.ics`  | Live calendar feed (all birthdays as yearly recurring events) |
