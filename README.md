# Palong Palo

A mobile-first web app that builds and manages badminton doubles match-ups for a regular group. Pick who is playing, generate a schedule, then edit it as the session goes. Later rounds rebuild automatically.

Installable on an iPhone or Android home screen and works offline after the first visit. Everything is saved in the browser (localStorage), so a refresh does not lose the session.

## Features

- **Roster:** tap to pick who is attending, add guests, remove names.
- **Courts:** 1 or 2 courts. Each court has its own length. A shorter court joins later and finishes together with the longer one.
- **Match length:** set minutes per match (default 20). Games are to 15, capped at 17, best of 3.
- **No waiting between courts:** when one court finishes first, picking its winner starts that court's next match right away with players who are free. A toast says who is up, with Undo.
- **Fair match-ups:** everyone faces everyone as much as possible, with opponents prioritised over partners. Rest and play time is spread evenly.
- **Edit any round:** tap a player to rest them, swap them with someone else, or take them out for the day. Rounds after the change rebuild.
- **Court controls:** skip a court for a single round, close a court from now on, or reopen it.
- **Change the length:** add one round or one hour, or delete a round.
- **Results:** pick the winning team per match. No scores are tracked.
- **Full schedule:** a compact list of every round plus an overall winner.
- **Stats:** who has the most and fewest games, with a bar per player.
- **Sounds:** soft tap sounds and small buzzes, with an on/off switch. iPhones stay silent if the ring switch is off.
- **Safe deletes:** deleting a round, removing a player or discarding a session asks first.
- **Undo:** every change shows a loader, then a toast with Undo.
- **Reshuffle:** regenerate the remaining rounds without touching finished matches.

## Using it

1. On the setup screen, pick the players, number of courts, minutes per match and how long each court plays.
2. Tap **Generate schedule**.
3. On the schedule screen, use the top icons: Full schedule, Add a round, Reshuffle, More.
4. Use the minus icon on a court card to skip that court for the round you are viewing.
5. Use the trash icon beside the match length to delete the current round.
6. Tap **Pick winner** on a match when it ends, then **Next round**.
7. Swipe left or right to move between rounds.

## How scheduling works

The scheduler is greedy and randomised, with many restarts, and keeps the best result.

1. Players with fewer games played are more likely to play, and long waits get a bonus.
2. The chosen players are split into matches by checking every possible split.
3. Each split is scored: repeat partners cost less than repeat opponents, so opponents are spread out first. Uneven games played are penalised.
4. The lowest-cost plan across all attempts wins.

When something changes, finished matches are kept and the rest is regenerated from the chosen round.

With 12 players on 2 courts for about 9 rounds, expect around 6 games each, near full opponent coverage and roughly half to two thirds partner coverage. One court gives far fewer games, so coverage is lower.

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
  js/app.js               UI, state, sheets, events
  js/sound.js             Tap sounds and small buzzes (Web Audio, no files)
  js/pwa.js               Registers the service worker
  icons/                  favicon.ico, favicon.svg, app icons, share image
  scripts/set-site-url.js Swaps the placeholder domain for yours
  tests/engine.test.js    Engine tests
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
- Data lives in one browser on one device. It is not shared between phones.
- Google Fonts load from the network. The layout falls back to system fonts if they cannot load.
