# Plan: "Streake" PWA

## Status (2026-11-08)
- **Done:** live at <https://seetee.github.io/streak/> on Supabase. Reset tested on localhost (right secret, wrong secret, one-minute guard). Security audit done and its fixes pushed; sign-ups off, sticker locked, `reset_streak` revoked from signed-in users.
- **Still to confirm:**
  - A real sticker tap after the permission change, on Android and iPhone, with the new app version (`streake-v2`).
  - Installing as an app and reloading offline.
  - The start date in `incidents`. The only row is the 2026-11-07 default, not a real incident. Remove any test rows afterwards.
  - Security Advisor: dismiss the `anon` warning on `reset_streak` (intentional) and check that the `authenticated` warning is gone.
  - Leftover copies of the secret deleted from browser history and the Supabase SQL Editor.
- **Cross-repo:** `ttrpg_progress_clock` and `jobbar_du_som_du_ska` got the same cache cleanup fix (only delete their own caches). Until that is live, they can still delete Streake's offline files. `bp`, `codepen`, `css`, `hardware`, `manual` and `osmosfeed` share `seetee.github.io` too and haven't been checked for this.
- **Later:** history graph (data already stored).

### Decisions from the audit
- **`anon` can call `reset_streak`:** intentional, because the page has to call it and the secret check protects it.
- **No keep-alive for Supabase pausing:** restore by hand if a long holiday pauses the project. Add a scheduled ping only if it becomes a nuisance.
- **No Content-Security-Policy:** nothing on the page can inject code, and whoever could tamper with `app.js` could remove the policy too.
- **No branch protection:** one-person repo.
- **Failed resets show no error:** the number not dropping to 0 is the feedback.

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
1. Serve locally (`python3 -m http.server --bind 127.0.0.1`); the page shows only the text and the number.
2. `/#reset=wrong` → rejected, number unchanged, no new row. `/#reset=<right>` → number 0, new row in `incidents`, hash removed.
3. DevTools → Application: manifest and service worker pass; offline reload still shows the last value.
4. Deploy to GitHub Pages, write the tag with a free NFC writer app (e.g. NFC Tools), tap from Android and iPhone.

## Later (data already supports it)
History graph from `incidents` gaps (separate view, e.g. `/#historik`, so the default screen stays bare).
