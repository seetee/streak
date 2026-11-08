# Plan: "Streake" PWA

## Status (2026-11-08)
- **Done:** all app files, `setup.sql`, icons, `README.md` (setup steps). Pre-launch fixes: secret stays out of the repo, publishable key, reset handled on an open page, number refreshes on a page left open, generic heading, `noindex`.
- **Not yet tested:** no live Supabase project yet, so loading data, resetting, the publishable key in `apikey` only, the service worker and installing as an app haven't been tried.
- **Next:** follow `README.md` → Setup steps 1–6, then → Testing.
- **Later:** history graph (data already stored).

## Context
Streake shows one thing: the text **"Dagar utan incident"** and a giant number (whole days since the last incident). Three people can reset it; the physical reset is **one NFC sticker** in a locked conference room (the locked door is the access control). Every incident is stored, so a history graph can be added later without migrating data. Hosting is GitHub Pages (static), so a small backend holds the data.

## Approach
- **Frontend:** static vanilla HTML/CSS/JS in `/home/kenneth/documents/git/streak/`, no build step, no framework.
- **Backend:** Supabase (EU region, FOSS, free tier).
- **Reset:** NFC sticker (NTAG213) holding `https://<user>.github.io/streak/#reset=<secret>`. Tapping opens the PWA, which calls the reset function. Works on Android and iPhone without Web NFC (Web NFC is Chrome-Android-only per MDN).

## Data model (history built in)
- Table `incidents(id bigint generated always as identity primary key, occurred_at timestamptz not null default now())`. **Append-only**: a reset inserts a row, nothing is ever updated or deleted.
- Current number = whole days between `max(occurred_at)` and today. Past streak lengths (the future graph) = gaps between consecutive rows. No extra storage needed later.
- Seed one row with the real date of the last incident (or today).
- RLS on; anon may `select` only; no insert/update/delete policy.
- Table `secrets` (not exposed) holds the reset secret hash.
- Function `reset_streak(secret text)` `security definer`: checks the secret, inserts a row, raises on mismatch.
- Optional guard: refuse a second reset within 1 minute, so a double tap doesn't create a duplicate row.

## Files
- `index.html` – the text "Dagar utan incident" above a giant number, nothing else. `lang="sv"`, `noindex`. Inline CSS (number sized with `clamp`/`vw`, centred, high contrast, `prefers-color-scheme`). `aria-live` on the number.
- `app.js` – fetch latest `occurred_at` (`order desc limit 1`), compute days, render. If `location.hash` has `#reset=...`: call RPC `reset_streak`, strip the hash with `history.replaceState`, re-render. Cache last value in `localStorage` for offline.
- `manifest.webmanifest` + `icon-192.png`/`icon-512.png` – name "Streake", `display: standalone`, `lang: sv`.
- `sw.js` – cache-first for the shell; data network-first.

## Security notes
- Secret in the URL **fragment** (`#`), so it is not sent to the Pages servers or logged there; stripped from the address bar after use. It is never committed: the repo is public, so `setup.sql` keeps the placeholder.
- Anyone who reads the tag with an NFC app gets the secret; accepted because of the locked room. Rotate by changing the DB secret and rewriting the tag.
- The Supabase publishable key in the repo is public by design; protection is RLS plus the function.

## Verification
1. Serve locally (`python3 -m http.server`); the page shows only the text and the number.
2. `/#reset=wrong` → rejected, number unchanged, no new row. `/#reset=<right>` → number 0, new row in `incidents`, hash removed.
3. DevTools → Application: manifest and service worker pass; offline reload still shows the last value.
4. Deploy to GitHub Pages, write the tag with a free NFC writer app (e.g. NFC Tools), tap from Android and iPhone.

## Later (data already supports it)
History graph from `incidents` gaps (separate view, e.g. `/#historik`, so the default screen stays bare).
