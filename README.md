# Streake

[![tests](https://img.shields.io/github/actions/workflow/status/seetee/streak/test.yml?branch=main&style=flat-square&label=tests)](https://github.com/seetee/streak/actions/workflows/test.yml)
[![vibe coded](https://img.shields.io/badge/vibe_coded-%E2%9C%A8-ff69b4?style=flat-square)](https://en.wikipedia.org/wiki/Vibe_coding)
[![coded with Claude](https://img.shields.io/badge/coded_with-Claude_Code-CC785C?style=flat-square&logo=anthropic)](https://claude.ai/code)
[![license: AGPL v3](https://img.shields.io/badge/license-AGPL_v3-blue?style=flat-square)](LICENSE)
[![dependencies: none](https://img.shields.io/badge/dependencies-none-brightgreen?style=flat-square)](app.js)
[![website](https://img.shields.io/badge/website-GitHub_Pages-222?style=flat-square&logo=githubpages)](https://seetee.github.io/streak/)

A days-since-the-last-incident counter you reset with a physical tap. It is an installable web app that shows one heading and one giant number, and an NFC sticker in a locked room resets it to zero.

**Live:** [seetee.github.io/streak](https://seetee.github.io/streak/)

## How it works

| Part | What it does |
|---|---|
| **Page** | Static HTML, CSS and JavaScript on GitHub Pages, with no framework or build step. |
| **Data** | Supabase stores every incident in the `incidents` table. |
| **Reset** | The sticker holds a URL with a secret after the `#`. Tapping it opens the page, which sends the secret to the `reset_streak` database function. |
| **Number** | Calendar days since the newest incident, in the viewer's local time. It refreshes hourly and when you return to the page. |
| **Offline** | A service worker caches the app, and the last known date keeps the number on screen. |

## Setup

1. **Create the database.** Make a project at [supabase.com](https://supabase.com) and pick an EU region.
2. **Make a secret:** `openssl rand -hex 16`
3. **Set up the tables.** Paste all of `setup.sql` into Supabase → SQL Editor and make these changes in the editor, not in the file:
   - Replace `CHANGE-ME-LONG-RANDOM-SECRET` with the secret.
   - Change `now() - interval '1 day'` in the last line to the date of the last incident, e.g. `'2026-10-01'`, if you know it.

   Then run it.
4. **Turn off sign-ups.** Under Authentication in the Supabase dashboard, turn off "Allow new users to sign up". The app has no logins, and leaving this on lets strangers register email addresses through your project.
5. **Connect the page.** Copy the Project URL and publishable key (`sb_publishable_…`) from the **Connect** button in the Supabase dashboard into `config.js`.
6. **Publish.** Push to GitHub, then turn on Pages under Settings → Pages (deploy from branch, root folder).
7. **Write the sticker.** Use a free writer app such as NFC Tools to write this URL record to an NTAG213 sticker:

   ```
   https://<user>.github.io/<repo>/#reset=<secret>
   ```

   Lock the sticker only after a test tap works, because locking is permanent.

To change the wording, edit the heading in `index.html`.

## Testing

**Automated:** this runs `app.js` against a simulated browser, and GitHub Actions runs it on every push.

```sh
node tests/check-app.mjs
```

**By hand:** run `python3 -m http.server --bind 127.0.0.1` in this folder and open <http://localhost:8000>. Only the heading and the number should show.

| Add to the address | Expected result |
|---|---|
| `#reset=wrong` | The number stays the same and no row is added. |
| `#reset=<secret>` | The number drops to 0, a row is added, and the secret leaves the address bar. |
| `#reset=<secret>` again within a minute | No new row. |

Then tap the sticker on both an Android phone and an iPhone.

Every successful test reset is a real row. Remove each one in the SQL Editor:

```sql
delete from incidents where id = (select max(id) from incidents);
```

## Security

- **The locked room is the access control.** Anyone who gets in can read the secret off the sticker with any NFC app, and can then reset from anywhere until the secret is changed. Resets don't record who made them. If you suspect a leak, change the secret (see Maintenance).
- **The secret stays out of the repo.** The repo is public, so never save the real secret in `setup.sql`. Before pushing, run this and paste the secret when asked. It keeps the secret out of your shell history and should list no files:

  ```sh
  read -rs s; grep -rlF "$s" .
  ```

- **Other copies of the secret.** It can also linger in browser history and in the Supabase SQL Editor, so delete it there after setup or testing.
- **The secret stays out of server logs.** Browsers don't send the part of a URL after `#` to the server, and the page removes it from the address bar after use.
- **The publishable key is public by design.** It can read `incidents` and call `reset_streak`, nothing more, as long as sign-ups stay off. The `secrets` table is closed to it.
- **Supabase's Security Advisor warns about `reset_streak`.** The warning that the `anon` role can call it is expected: the page has to call it, and the secret check inside the function is the protection.

## Maintenance

- **Change the secret.** Run this in the SQL Editor, then rewrite the sticker:

  ```sql
  update secrets set hash = sha256(convert_to('<new secret>', 'utf8'));
  ```

- **Change app files.** Bump the `streake-v…` number in `sw.js`, or installed phones keep the old version.
- **Double taps.** A tap within a minute of a reset is ignored, so a double tap isn't counted twice.
- **Paused database.** Free Supabase projects pause after about a week with too little database activity, so long holidays can trigger it. You get a warning email, and you can restore the project from the Supabase dashboard. While it is paused, the page shows the last known number and taps do nothing.
- **History.** The public key can't edit or delete rows in `incidents`, so a history graph can be built later from the gaps between rows.

## License

[GNU AGPL v3](LICENSE).
