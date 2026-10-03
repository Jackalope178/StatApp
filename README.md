# StatApp

Live soccer stat tracking for the sideline. Every tap saves on the device immediately,
so no signal never stalls tracking or loses data. Saved entries upload to Supabase in the
background whenever there is a connection.

## What it does

- **Match clock** with Kick off / Pause / Resume.
- **Two possession stopwatches**, one per team. Tap a team to give it possession, or use
  **Switch possession**. Tap ✎ to rename a team.
- **Event buttons for each team**: Goal, Shot, Shot on goal, Chance created, Pass, Tackle, Foul.
- **Goal** opens a box for the scorer and the assist, with suggestions from the player databank.
  New names are added to the databank automatically.
- **Colour-coded timeline**: home team above the line, away team below. Tap a marker to see
  what happened and in which minute.
- **Undo last** and an event log with delete, for mis-taps.
- **Stat sheet** when the match ends: score, scorers, possession, all counts for both teams,
  plus Summary CSV, Events CSV, and Print / PDF.

The Events CSV includes the match clock (`match_clock`, `match_ms`) and the real time of
each tap (`recorded_at`), to help line events up with separately recorded footage.

## How data is kept safe

1. Each tap is written to the browser's on-device database (IndexedDB, via Dexie).
   The UI never waits on the network.
2. A background sync (`src/sync.ts`) uploads unsynced rows to Supabase every 15 seconds,
   when the device comes back online, and shortly after each tap. Uploads are upserts keyed
   on IDs created on the device, so retries never duplicate data.
3. The badge at the top shows the state: `All saved to cloud`, `Offline · N saved on device`,
   and so on. Tap it to retry.
4. The app is a PWA: a service worker caches it, so it opens with no signal.
   **Open it once on Wi-Fi before the game** (and ideally "Add to Home Screen").

## Running it locally

```bash
npm install
npm run dev       # development server
npm test          # unit tests
npm run lint
npm run build     # production build in dist/
npm run preview   # serve the production build (service worker active)
```

## Connecting Supabase

1. In the Supabase dashboard, open **SQL Editor** and run `supabase/migrations/0001_init.sql`.
2. Copy `.env.example` to `.env.local` and fill in the project URL and the publishable
   (or anon) key from the project's API settings.
3. Restart `npm run dev`. The badge should change from "On-device only" to "All saved to cloud".

Without these values the app still works fully, saving on the device only.

> **Security note:** there is no login yet. The table policies let anyone who has the
> app's public key read and write the data. That is fine for getting started; add
> Supabase Auth before sharing the app publicly.

## Hosting (GitHub Pages)

Every push to `main` runs `.github/workflows/deploy.yml`, which lints, tests, builds, and
publishes the app to `https://<owner>.github.io/<repo>/`.

One-time setup in the GitHub repo:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. Optional, for cloud sync: **Settings → Secrets and variables → Actions → New repository secret**,
   add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, then re-run the workflow
   (**Actions → Deploy to GitHub Pages → Run workflow**).

## Project layout

| Path | Purpose |
| --- | --- |
| `src/clock.ts` | Match clock and possession timer logic (pure functions, tested) |
| `src/db.ts` | On-device database tables |
| `src/actions.ts` | Every write the app makes (log event, rename team, …) |
| `src/sync.ts` | Background upload to Supabase |
| `src/stats.ts`, `src/export.ts` | Stat sheet numbers and CSV export |
| `src/components/` | Screens: match list, live tracking, timeline, goal box, stat sheet, players |
| `supabase/migrations/` | Database schema for Supabase |
| `.github/workflows/deploy.yml` | Build and publish to GitHub Pages |
