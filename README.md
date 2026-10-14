# Doubles Badminton Queueing

A mobile-first web app that builds and manages badminton doubles match-ups for a regular group. Pick who is playing, generate a schedule, then edit it as the session goes. Later rounds rebuild automatically.

Works as a normal web page and can be added to an iPhone home screen. Everything is saved in the browser (localStorage), so a refresh does not lose the session.

## Features

- **Roster:** tap to pick who is attending, add guests, remove names.
- **Courts:** 1 or 2 courts. Each court has its own length. A shorter court joins later and finishes together with the longer one.
- **Match length:** set minutes per match (default 20). Games are to 15, capped at 17, best of 3.
- **Fair match-ups:** everyone faces everyone as much as possible, with opponents prioritised over partners. Rest and play time is spread evenly.
- **Edit any round:** tap a player to rest them, swap them with someone else, or take them out for the day. Rounds after the change rebuild.
- **Court controls:** skip a court for a single round, close a court from now on, or reopen it.
- **Change the length:** add one round or one hour, or delete a round.
- **Results:** pick the winning team per match. No scores are tracked.
- **Full schedule:** a compact list of every round plus an overall winner.
- **Undo:** every change shows a toast with Undo.
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

| File | Purpose |
| --- | --- |
| `engine.js` | Pure scheduling and edit logic. Also runs under Node for tests. |
| `app.js` | UI, state, sheets and event handling. |
| `style.css` | Styles, based on `DESIGN.md` (ivory and matcha palette, Inter and Zen Maru Gothic, top-down court SVG). |
| `build.js` | Bundles everything into `dist/page.html` and a local test page `dist/test.html`. |

No framework and no dependencies. Plain JavaScript, one output file.

## Build and run

```
node build.js
```

Open `dist/test.html` in a browser, or publish `dist/page.html` anywhere that serves static files.

To run the engine on its own:

```
node -e "const e=require('./engine.js'); console.log(Object.keys(e))"
```

## Limits

- The page needs a connection to load. There is no service worker, so it is not a true offline PWA. A home-screen shortcut opens it like a web page, not a standalone app.
- Data lives in one browser on one device. It is not shared between phones.
- Google Fonts load from the network. The layout falls back to system fonts if they cannot load.
