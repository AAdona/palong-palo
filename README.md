# Palong Palo

A mobile-first web app that makes badminton doubles match-ups for a regular group. Pick who is playing, start the session, and each court gets its next match the moment its game finishes. Nothing is planned ahead, so a court never waits on players who are still on the other court.

Installable on an iPhone or Android home screen and works offline after the first visit. Everything is saved in the browser (localStorage), so a refresh does not lose the session.

## Features

- **Roster:** tap to pick who is attending, add guests, remove names.
- **Courts:** 1 or 2 courts. Name them with the numbers painted on your courts, like 5 and 6. Numbers only, 1 to 99. You can change them mid-session from the ⋯ menu.
- **Live matches, no future rounds:** only the matches on court are shown. When a court finishes, only that court gets a new match, made from players who are not on any court right now. The other court keeps playing untouched.
- **Shuttlecock:** while a game is playing, a shuttlecock flies back and forth over its court. It stops if the phone is set to reduce motion.
- **Played list:** finished games show under **Played**, newest first. Tap one to change its winner.
- **Fair match-ups:** the players with the fewest games and the longest rest come first. Among those, repeat teammates and opponents are avoided, opponents first.
- **Waiting courts:** if fewer than 4 players are free, the court shows "Waiting" and gets its match as soon as enough players are free.
- **Late arrivals:** add someone mid-session from Players. They are picked for the next match that gets made, but are not given extra games to catch up with the others.
- **Edit a match up next:** tap a player to rest them, swap them with someone else, or take them out for the day. A game already started cannot be changed.
- **Court controls:** close a court so it makes no new matches (its current game finishes), or open it again.
- **Start game:** a match is "Up next" until you press **Start game**. Then it shows "Playing now" and is kept in place if you shuffle. Undo is in the toast.
- **Results:** pick the winning team once a game is started. No scores are tracked. A winner can be cleared while its court has not moved on.
- **Saved results:** logged winners are kept when you start a new session. **Saved results and backup** (on the setup screen and in the ⋯ menu) shows all-time wins, losses, win rate and the best duo.
- **Backup and import:** save all results to a `.json` file, and import it on the same or another phone. Importing adds new sessions and skips ones already saved, so importing twice is safe.
- **Rename players:** in the players list (Add on the setup screen, or Players in a session). A rename updates the roster, the current session and saved results.
- **Standings:** wins and losses for the session, with who is leading.
- **Dark mode:** Auto (follows the phone), Light or Dark. Pick it in the ⋯ menu, or with the sun/moon button on the setup screen. Remembered per device.
- **Stats:** who has the most and fewest games, with a bar per player, plus a link to the all-time results.
- **Sounds:** soft tap sounds and small buzzes, with an on/off switch. iPhones stay silent if the ring switch is off.
- **Safe deletes:** removing a player or starting a new session asks first.
- **Undo:** every change shows a loader, then a toast with Undo.
- **Two shuffles:** the shuffle button remakes the matches that are only up next, and asks which kind. **Total shuffle** gives random teams and opponents. **Fresh partners** pairs people who have been teammates the fewest times, then spreads opponents. Players with fewer games still come first, and started or finished games are left alone.

## Using it

1. On the setup screen, pick the players, 1 or 2 courts, and the court numbers.
2. Tap **Start session**. Each court gets a match, shown as **Up next**.
3. When the players walk on, tap **Start game**. The match shows **Playing now**.
4. When a game ends, tap **Pick winner**. That court gets its next match right away, using only players who are not on court.
5. Use the top icons for Stats, Shuffle and More. Use the bottom buttons for Players and Standings.

## How matches are made

A match is made for a court only when the court is free, using only players who are not in any other match.

1. Players are ranked: fewer games played comes first, then the longest rest.
2. The few most deserving players are tried in every combination of four.
3. Each combination is split into two teams every possible way and scored. Repeat partners and repeat opponents cost more, and opponents cost more than partners. The lowest cost wins.

Because courts finish at different times, games stay close to even but are not forced equal. With 12 players on 2 courts, expect near full opponent coverage and most partners met over a few hours.

## Project layout

```
palong-palo/
  index.html              Page shell, SEO tags, social cards, structured data
  manifest.webmanifest    Home-screen app settings
  sw.js                   Service worker (offline support)
  robots.txt, sitemap.xml Search engine files
  vercel.json             Headers, caching, security policy
  css/style.css           All styles (ivory and matcha palette from DESIGN.md)
  js/engine.js            Scheduling and edit logic, no DOM code
  js/history.js           Saved results, backup file, import and all-time stats, no DOM code
  js/app.js               UI, state, sheets, events
  js/theme.js             Light, dark or auto theme, applied before first paint
  js/sound.js             Tap sounds and small buzzes (Web Audio, no files)
  js/pwa.js               Registers the service worker
  icons/                  favicon.ico, favicon.svg, app icons, share image
  scripts/set-site-url.js Swaps the placeholder domain for yours
  tests/engine.test.js    Engine tests
  tests/history.test.js   Saved results, backup and stats tests
```

No framework, no dependencies, no build step. The files are served as they are.

## Run locally

```
npm run dev      # serves the folder at http://localhost:3000
npm test         # runs the engine tests (Node 18 or newer)
```

## Deploy on Vercel

1. Push this folder to a Git repository, or run `npx vercel` inside it.
2. In Vercel, import the repository. Framework preset: **Other**. Leave the build command and output directory empty.
3. After you know your final URL, run once and commit:

   ```
   npm run set-url https://your-domain.com
   ```

   This updates the canonical link, social card URLs, structured data, `robots.txt` and `sitemap.xml`.
4. Optional: submit `https://your-domain.com/sitemap.xml` in Google Search Console.

`vercel.json` already sets security headers, a content security policy, and cache rules. `tests`, `scripts` and this README are excluded from the deploy by `.vercelignore`.

## SEO and sharing

- Descriptive title and meta description, canonical URL, robots rules.
- Open Graph and Twitter card tags with a 1200 by 630 share image.
- `WebApplication` structured data (JSON-LD).
- Readable fallback text inside the page for crawlers and visitors without JavaScript.
- `robots.txt` and `sitemap.xml`.

## Icons

All icons come from one design: a top-down court with two players on each side. `icons/favicon.svg` is the source. The PNG sizes, `favicon.ico` and the maskable Android icon are rendered from it. If you change the design, re-export those files at the same names.

## Updating the app after deploy

Edit the files and push. The service worker fetches from the network first and falls back to its cache, so players get new versions on the next online visit. To force every device to drop old files, change `VERSION` in `sw.js`.

## Limits

- Offline support needs the site to be served over HTTPS (Vercel does this) and opened once while online.
- Data lives in one browser on one device. It is not shared between phones. Use Save backup and Import backup to move results.
- Names are the identity. If a player is renamed on one phone, importing an older backup that still has the old name brings the old name back as a separate player.
- Google Fonts load from the network. The layout falls back to system fonts if they cannot load.
