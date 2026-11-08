# Streake

A PWA that shows "Dagar utan incident" and the number of days since the last incident. Tapping an NFC sticker resets it. Static files on GitHub Pages, data in Supabase.

## Setup

1. **Create the database.** Make a project at [supabase.com](https://supabase.com) and pick an EU region.
2. **Make a secret:** `openssl rand -hex 16`
3. **Set up the tables.** Paste all of `setup.sql` into Supabase → SQL Editor. Make these changes in the editor, not in the file, because the repo is public and the secret must never be committed: replace `CHANGE-ME-LONG-RANDOM-SECRET` with the secret, and if you know when the last incident happened, change `now() - interval '1 day'` in the last line to that date, e.g. `'2026-10-01'`. Then run it.
4. **Connect the page.** Copy the Project URL and publishable key (`sb_publishable_…`) from the **Connect** button in the Supabase dashboard into `config.js`.
5. **Publish.** Push to GitHub, then turn on Pages under Settings → Pages (deploy from branch, root folder).
6. **Write the sticker.** Use a free writer app such as NFC Tools to write this URL record to an NTAG213 sticker:
   `https://<user>.github.io/<repo>/#reset=<secret>`

## Testing

- `python3 -m http.server` in this folder, then open http://localhost:8000. Only the text and the number should show.
- Add `#reset=wrong` to the address: the number stays the same and no row is added in Supabase.
- Add `#reset=<secret>`: the number drops to 0, a new row appears in `incidents`, and the secret disappears from the address bar. Add it again within a minute: no new row.
- Before the first push, check that the real secret isn't in any file: `grep -r '<secret>' .`
- Tap the sticker on both an Android phone and an iPhone.

## Maintenance

- **Change the secret.** Supabase → SQL Editor:
  `update secrets set hash = sha256(convert_to('<new secret>', 'utf8'));`
  Then rewrite the sticker.
- **After changing app files,** bump `streake-v1` in `sw.js` (to `streake-v2` and so on). Otherwise installed phones keep the old version.
- **A tap within a minute of a reset is ignored,** so a double tap isn't counted twice.
- **Free Supabase projects pause** after about a week with too little database activity, so long holidays can trigger it. You get a warning email, and it can be restored from the Supabase dashboard. While paused, the page shows the last known number and taps do nothing.
- **Security is the locked room.** Anyone who gets in can read the secret off the sticker with any NFC app.
- **History** is kept in `incidents`. Rows are only ever added, never edited or deleted, so a history graph can be built later from the gaps between rows.
