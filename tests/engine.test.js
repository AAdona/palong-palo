const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../js/engine.js');

const NAMES = ['Ana', 'Ben', 'Cy', 'Dee', 'Eli', 'Fay', 'Gus', 'Hal', 'Ivy', 'Jo', 'Kim', 'Lee'];
const cfg = (courts, labels) => ({ courts, labels: labels || ['1', '2'] });
const open = (S) => S.matches.filter((m) => !m.done);
const playersOf = (m) => m.a.concat(m.b);
const finish = (S, m, w) => {
  E.setResult(S, m.id, w || 'a');
  return E.fill(S);
};
const noDoubleBooking = (S) => {
  const seen = open(S).flatMap(playersOf);
  assert.equal(new Set(seen).size, seen.length, 'someone is in two matches at once');
  open(S).forEach((m) => assert.equal(new Set(playersOf(m)).size, 4));
};
const games = (S) => {
  const g = Object.fromEntries(S.active.map((n) => [n, 0]));
  S.matches.forEach((m) => playersOf(m).forEach((n) => (g[n] = (g[n] || 0) + 1)));
  return g;
};

/* ---- starting a session ---- */
test('a new session makes one match per court and nothing ahead', () => {
  const S = E.newSession(cfg(2), NAMES);
  assert.equal(S.matches.length, 2);
  assert.deepEqual(S.matches.map((m) => m.c).sort(), [1, 2]);
  assert.ok(S.matches.every((m) => !m.started && !m.done));
  noDoubleBooking(S);
  assert.ok(S.id && S.created);
});

test('one court makes one match', () => {
  const S = E.newSession(cfg(1), NAMES);
  assert.equal(S.matches.length, 1);
  assert.equal(S.courts.length, 1);
});

test('court numbers are kept as typed', () => {
  const S = E.newSession(cfg(2, ['5', '6']), NAMES);
  assert.deepEqual(
    S.courts.map((c) => c.label),
    ['5', '6'],
  );
  assert.equal(E.courtLabel(S, 2), '6');
  assert.equal(E.newSession(cfg(1, ['7', '8']), NAMES).courts.length, 1);
});

test('with fewer than 8 players only one court runs at a time', () => {
  const S = E.newSession(cfg(2), NAMES.slice(0, 7));
  assert.equal(S.matches.length, 1);
  assert.equal(E.pendingOn(S, 2), null);
  const made = finish(S, S.matches[0]);
  assert.equal(made.length, 1);
  noDoubleBooking(S);
});

test('a court waits when fewer than 4 players are free, and fills when more are', () => {
  const S = E.newSession(cfg(2), NAMES.slice(0, 8));
  const c1 = E.pendingOn(S, 1),
    c2 = E.pendingOn(S, 2);
  E.startMatch(S, c1.id);
  E.startMatch(S, c2.id);
  E.playerOut(S, c1.a[0], null); /* leaves, but finishes the game on court */
  assert.equal(finish(S, c1).length, 0, 'only 3 are free, so court 1 waits');
  assert.equal(E.pendingOn(S, 1), null);
  const made = finish(S, c2);
  assert.equal(made.length, 1, '7 players left, so one court can run once court 2 is free too');
  noDoubleBooking(S);
  assert.ok(!S.matches.filter((m) => !m.done).flatMap(playersOf).includes(c1.a[0]));
});

test('fewer than 4 players makes no match', () => {
  const S = E.newSession(cfg(2), NAMES.slice(0, 3));
  assert.equal(S.matches.length, 0);
});

/* ---- the main rule: a finished court gets a match from free players only ---- */
test('when one court finishes, only that court gets a new match, without anyone still playing', () => {
  for (let run = 0; run < 40; run++) {
    const S = E.newSession(cfg(2), NAMES);
    const c2 = E.pendingOn(S, 2),
      c1 = E.pendingOn(S, 1);
    E.startMatch(S, c1.id);
    E.startMatch(S, c2.id);
    const made = finish(S, c1);
    assert.equal(made.length, 1);
    assert.equal(made[0].c, 1);
    assert.equal(S.matches.length, 3, 'no rounds were made ahead');
    assert.ok(playersOf(made[0]).every((p) => !playersOf(c2).includes(p)), 'used a player still on court 2');
    assert.equal(E.pendingOn(S, 2), c2, 'court 2 is untouched');
    noDoubleBooking(S);
  }
});

test('the players who rested are brought in first', () => {
  for (let run = 0; run < 25; run++) {
    const S = E.newSession(cfg(2), NAMES);
    const c1 = E.pendingOn(S, 1);
    const resting = S.active.filter((p) => !open(S).flatMap(playersOf).includes(p));
    const made = finish(S, c1);
    assert.ok(resting.every((p) => playersOf(made[0]).includes(p)), 'a rested player was left out');
  }
});

test('a full session never double books anyone, even when courts finish in a random order', () => {
  for (let run = 0; run < 12; run++) {
    const S = E.newSession(cfg(2), NAMES);
    for (let i = 0; i < 40; i++) {
      const m = open(S)[Math.floor(Math.random() * open(S).length)];
      finish(S, m, Math.random() < 0.5 ? 'a' : 'b');
      noDoubleBooking(S);
      assert.ok(open(S).length <= 2);
    }
  }
});

test('games stay within two of each other when the courts finish in turn', () => {
  for (let run = 0; run < 12; run++) {
    const S = E.newSession(cfg(2), NAMES);
    for (let i = 0; i < 40; i++) finish(S, open(S).sort((x, y) => x.n - y.n)[0]);
    const g = Object.values(games(S));
    assert.ok(Math.max(...g) - Math.min(...g) <= 2, 'games spread too wide: ' + g.join(','));
  }
});

test('opponents and partners are spread out over a session', () => {
  let opp = 0,
    partner = 0,
    runs = 10;
  for (let run = 0; run < runs; run++) {
    const S = E.newSession(cfg(2), NAMES);
    for (let i = 0; i < 24; i++) finish(S, open(S)[i % open(S).length]);
    const sm = E.summarize(S);
    opp += sm.oppPct;
    partner += sm.partnerPct;
  }
  assert.ok(opp / runs >= 80, 'opponent coverage ' + opp / runs);
  assert.ok(partner / runs >= 40, 'partner coverage ' + partner / runs);
});

/* ---- start button ---- */
test('a match can be started once, and a finished one cannot', () => {
  const S = E.newSession(cfg(2), NAMES);
  const m = E.pendingOn(S, 1);
  assert.ok(E.startMatch(S, m.id));
  assert.equal(m.started, true);
  assert.ok(m.startedAt);
  assert.equal(E.startMatch(S, m.id), null);
  finish(S, m);
  assert.equal(E.startMatch(S, m.id), null);
});

/* ---- shuffle ---- */
test('shuffle keeps started and finished matches and rebuilds the ones up next', () => {
  let changed = 0;
  for (let run = 0; run < 20; run++) {
    const S = E.newSession(cfg(2), NAMES);
    const c1 = E.pendingOn(S, 1),
      c2 = E.pendingOn(S, 2);
    E.startMatch(S, c1.id);
    const before = playersOf(c2).join();
    E.reroll(S, 'random');
    assert.equal(E.pendingOn(S, 1), c1, 'started match stays');
    const now = E.pendingOn(S, 2);
    assert.ok(now.c === 2 && !now.started);
    if (playersOf(now).join() !== before) changed++;
    noDoubleBooking(S);
  }
  assert.ok(changed >= 10, 'up next should usually change, changed ' + changed + '/20');
});

test('shuffle makes a match for an empty court and never uses players on court', () => {
  const S = E.newSession(cfg(2), NAMES);
  E.startMatch(S, E.pendingOn(S, 1).id);
  E.startMatch(S, E.pendingOn(S, 2).id);
  assert.deepEqual(E.reroll(S, 'partners'), []);
  assert.equal(S.matches.length, 2);
});

const partnerRepeats = (S) => {
  const c = {};
  S.matches.forEach((m) =>
    [m.a, m.b].forEach((t) => {
      const k = [...t].sort().join('|');
      c[k] = (c[k] || 0) + 1;
    }),
  );
  return Object.values(c).reduce((s, n) => s + Math.max(0, n - 1), 0);
};
test('fresh partners repeats teammates less than a total shuffle', () => {
  const play = (mode) => {
    const S = E.newSession(cfg(2), NAMES);
    for (let i = 0; i < 8; i++) {
      finish(S, open(S)[0]);
      E.reroll(S, mode);
    }
    return partnerRepeats(S);
  };
  let fresh = 0,
    random = 0;
  const runs = 15;
  for (let i = 0; i < runs; i++) {
    fresh += play('partners');
    random += play('random');
  }
  assert.ok(fresh < random, 'fresh ' + fresh / runs + ' vs random ' + random / runs);
});

/* ---- results ---- */
test('a result can be taken back when the court has not moved on, and the queued match is removed', () => {
  const S = E.newSession(cfg(2), NAMES);
  const c1 = E.pendingOn(S, 1);
  E.startMatch(S, c1.id);
  finish(S, c1);
  const next = E.pendingOn(S, 1);
  assert.ok(next && next !== c1);
  assert.equal(E.canReopen(S, c1.id), true);
  assert.ok(E.reopen(S, c1.id));
  assert.equal(c1.done, false);
  assert.equal(E.pendingOn(S, 1), c1);
  assert.ok(!S.matches.includes(next), 'queued match was removed');
  noDoubleBooking(S);
});

test('a result cannot be taken back once the court started its next match', () => {
  const S = E.newSession(cfg(2), NAMES);
  const c1 = E.pendingOn(S, 1);
  finish(S, c1);
  E.startMatch(S, E.pendingOn(S, 1).id);
  assert.equal(E.canReopen(S, c1.id), false);
  assert.equal(E.reopen(S, c1.id), false);
});

test('a result cannot be taken back if one of its players is already in the other court match', () => {
  for (let run = 0; run < 30; run++) {
    const S = E.newSession(cfg(2), NAMES);
    const c1 = E.pendingOn(S, 1),
      c2 = E.pendingOn(S, 2);
    finish(S, c1);
    const made = finish(S, c2);
    const clash = made.some((m) => playersOf(m).some((p) => playersOf(c1).includes(p)));
    if (clash) assert.equal(E.canReopen(S, c1.id), false);
  }
});

test('changing a winner keeps the finish order', () => {
  const S = E.newSession(cfg(2), NAMES);
  const m = E.pendingOn(S, 1);
  finish(S, m, 'a');
  const at = m.doneAt;
  E.setResult(S, m.id, 'b');
  assert.equal(m.winner, 'b');
  assert.equal(m.doneAt, at);
});

/* ---- edits ---- */
test('swap a player with a free player or with a player in the other match up next', () => {
  const S = E.newSession(cfg(2), NAMES);
  const c1 = E.pendingOn(S, 1),
    c2 = E.pendingOn(S, 2);
  const free = E.freePlayers(S)[0];
  const p = c1.a[0];
  assert.ok(E.swapPlayers(S, p, free));
  assert.ok(c1.a.includes(free) && E.freePlayers(S).includes(p));
  const q = c2.b[1];
  assert.ok(E.swapPlayers(S, free, q));
  assert.ok(c1.a.includes(q) && c2.b.includes(free));
  noDoubleBooking(S);
});

test('a player in a started match cannot be swapped, and a player on court cannot be pulled in', () => {
  const S = E.newSession(cfg(2), NAMES);
  const c1 = E.pendingOn(S, 1),
    c2 = E.pendingOn(S, 2);
  E.startMatch(S, c1.id);
  assert.equal(E.swapPlayers(S, c1.a[0], E.freePlayers(S)[0]), false);
  assert.equal(E.swapPlayers(S, c2.a[0], c1.b[0]), false);
  assert.equal(E.swapPlayers(S, c2.a[0], 'Nobody'), false);
});

test('out for today: a free player steps in, or the match is made again without them', () => {
  const S = E.newSession(cfg(2), NAMES);
  const c1 = E.pendingOn(S, 1);
  const out = c1.a[0],
    sub = E.freePlayers(S)[0];
  E.playerOut(S, out, sub);
  assert.ok(c1.a.includes(sub) && !S.active.includes(out));
  const out2 = E.pendingOn(S, 2).a[0];
  E.playerOut(S, out2, null);
  assert.ok(!E.pendingOn(S, 2).a.includes(out2) && !E.pendingOn(S, 2).b.includes(out2));
  noDoubleBooking(S);
});

test('out for today leaves a match that is already on court alone', () => {
  const S = E.newSession(cfg(2), NAMES);
  const c1 = E.pendingOn(S, 1);
  E.startMatch(S, c1.id);
  const who = c1.a[0];
  E.playerOut(S, who, null);
  assert.equal(E.pendingOn(S, 1), c1);
  assert.ok(playersOf(c1).includes(who));
  assert.ok(!S.active.includes(who));
  finish(S, c1);
  const all = E.pendingOn(S, 1) ? playersOf(E.pendingOn(S, 1)) : [];
  assert.ok(!all.includes(who), 'someone who left is back on court');
});

test('a late player is scheduled but does not get extra games to catch up', () => {
  for (let run = 0; run < 8; run++) {
    const S = E.newSession(cfg(2), NAMES.slice(0, 11));
    for (let i = 0; i < 8; i++) finish(S, open(S)[0]);
    E.playerIn(S, 'Late');
    for (let i = 0; i < 30; i++) finish(S, open(S)[i % open(S).length]);
    const g = games(S);
    const others = NAMES.slice(0, 11).map((n) => g[n]);
    assert.ok(g.Late >= 3, 'late player should get games, got ' + g.Late);
    assert.ok(g.Late <= Math.min(...others), 'late player caught up: ' + g.Late + ' vs ' + others.join(','));
  }
});

test('a late player fills a court that was waiting for players', () => {
  const S = E.newSession(cfg(2), NAMES.slice(0, 7));
  assert.equal(S.matches.length, 1);
  E.playerIn(S, 'Late');
  assert.equal(S.matches.length, 2);
  noDoubleBooking(S);
});

test('closing a court drops a match not started, keeps a started one, and opening fills it', () => {
  const S = E.newSession(cfg(2), NAMES);
  const c1 = E.pendingOn(S, 1);
  E.startMatch(S, c1.id);
  E.setCourtOpen(S, 1, false);
  E.setCourtOpen(S, 2, false);
  assert.equal(E.pendingOn(S, 1), c1, 'started match stays');
  assert.equal(E.pendingOn(S, 2), null, 'queued match was dropped');
  finish(S, c1);
  assert.equal(E.pendingOn(S, 1), null, 'a closed court makes no new match');
  E.setCourtOpen(S, 2, true);
  assert.ok(E.pendingOn(S, 2));
  noDoubleBooking(S);
});

test('renaming a player updates matches, the active list and the late baseline', () => {
  const S = E.newSession(cfg(2), NAMES);
  E.playerIn(S, 'Late');
  finish(S, open(S)[0]);
  E.renameInSession(S, 'Late', 'Latecomer');
  E.renameInSession(S, 'Ana', 'Anna');
  assert.ok(S.active.includes('Anna') && !S.active.includes('Ana'));
  assert.ok(S.baseline.Latecomer !== undefined && S.baseline.Late === undefined);
  const names = E.summarize(S).per;
  assert.ok(names.Anna && !names.Ana);
  const all = S.matches.flatMap(playersOf);
  assert.ok(!all.includes('Ana') && !all.includes('Late'));
});

/* ---- older saves ---- */
const legacy = () => ({
  id: 'old1',
  active: NAMES.slice(0, 10),
  courts: 2,
  baseline: {},
  rounds: [
    {
      matches: [
        { id: 'a1', court: 1, a: ['Ana', 'Ben'], b: ['Cy', 'Dee'], done: true, winner: 'a' },
        { id: 'a2', court: 2, a: ['Eli', 'Fay'], b: ['Gus', 'Hal'], done: true, winner: 'b' },
      ],
      rest: ['Ivy', 'Jo'],
    },
    {
      matches: [
        { id: 'b1', court: 1, a: ['Ivy', 'Jo'], b: ['Ana', 'Eli'], done: false },
        { id: 'b2', court: 2, a: ['Ben', 'Gus'], b: ['Cy', 'Fay'], done: false, started: true },
      ],
      rest: ['Dee', 'Hal'],
    },
    {
      matches: [{ id: 'c1', court: 1, a: ['Dee', 'Hal'], b: ['Ana', 'Ben'], done: false }],
      rest: [],
    },
  ],
});
test('an older save keeps finished matches and what is on court, and drops later rounds', () => {
  const S = E.fromLegacy(legacy());
  assert.equal(S.matches.filter((m) => m.done).length, 2);
  assert.equal(E.finished(S)[0].winner, 'a');
  const up = open(S);
  assert.equal(up.length, 2);
  assert.ok(up.find((m) => m.id === 'b2').started);
  assert.ok(!up.find((m) => m.id === 'b1').started);
  assert.ok(!S.matches.some((m) => m.id === 'c1'));
  assert.equal(S.courts.length, 2);
  noDoubleBooking(S);
});
test('a save in the new format is returned as it is, and junk is rejected', () => {
  const S = E.newSession(cfg(2), NAMES);
  assert.equal(E.fromLegacy(S), S);
  assert.equal(E.fromLegacy(null), null);
  assert.equal(E.fromLegacy({ active: [] }), null);
});

test('someone marked out stays in the players list so they can be brought back', () => {
  const S = E.newSession(cfg(2), NAMES);
  const sub = E.freePlayers(S)[0];
  const out = E.pendingOn(S, 1).a[0];
  E.playerOut(S, out, sub);
  assert.ok(E.allNames(S).includes(out), 'the player who left is still listed');
  E.renameInSession(S, out, 'Renamed');
  assert.ok(E.allNames(S).includes('Renamed'));
  E.playerIn(S, 'Renamed');
  assert.ok(S.active.includes('Renamed') && !S.left.includes('Renamed'));
});

test('replacePlayed fixes who played, in started and finished matches', () => {
  const E2 = require('../js/engine.js');
  const S = E2.newSession({ courts: 1, labels: ['1'] }, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']);
  E2.fill(S);
  const m = S.matches[0];
  E2.startMatch(S, m.id);
  const out = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].filter((p) => ![...m.a, ...m.b].includes(p))[0];
  const from = m.a[0];
  assert.equal(E2.replacePlayed(S, m.id, from, m.b[0]), false); // already in match
  assert.equal(E2.replacePlayed(S, m.id, from, out), true);
  assert.ok(m.a.includes(out) && !m.a.includes(from));
  E2.setResult(S, m.id, 'a');
  const done = S.matches.find((x) => x.done);
  const next = S.matches.find((x) => !x.done);
  if (next) {
    const inNext = next.a[0];
    assert.equal(E2.replacePlayed(S, done.id, done.a[0], inNext), true); // finished: allowed
  }
});

test('summarize reports when everyone has partnered with everyone', () => {
  const E2 = require('../js/engine.js');
  const S = E2.newSession({ courts: 1, labels: ['1'] }, ['A', 'B', 'C', 'D']);
  const mk = (a, b) => ({ id: 'x' + a + b, c: 1, a, b, started: true, done: true, winner: 'a', doneAt: S.matches.length + 1 });
  S.matches.push(mk(['A', 'B'], ['C', 'D']));
  assert.equal(E2.summarize(S).allPaired, false);
  assert.equal(E2.summarize(S).pairMet, 2);
  S.matches.push(mk(['A', 'C'], ['B', 'D']));
  S.matches.push(mk(['A', 'D'], ['B', 'C']));
  const sm = E2.summarize(S);
  assert.equal(sm.allPaired, true);
  assert.equal(sm.pairTotal, 6);
});

test('fresh partners mode ignores games played and stays on for later matches', () => {
  const E2 = require('../js/engine.js');
  const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  let repeats = 0;
  for (let t = 0; t < 20; t++) {
    const S = E2.newSession({ courts: 2, labels: ['1', '2'] }, names);
    E2.reroll(S, 'partners');
    assert.equal(S.mode, 'partners');
    const seen = new Set();
    for (let g = 0; g < 8; g++) {
      const m = S.matches.find((x) => !x.done);
      E2.startMatch(S, m.id);
      E2.setResult(S, m.id, 'a');
      E2.fill(S);
      [m.a, m.b].forEach((tm) => {
        const k = [...tm].sort().join('|');
        if (seen.has(k)) repeats++;
        seen.add(k);
      });
    }
  }
  assert.ok(repeats <= 3, 'repeat partnerships: ' + repeats);
  const S2 = E2.newSession({ courts: 1, labels: ['1'] }, names);
  E2.reroll(S2, 'random');
  assert.equal(S2.mode, null);
});

test('wrapUp ranks players and finds the awards', () => {
  const E2 = require('../js/engine.js');
  const S = E2.newSession({ courts: 1, labels: ['1'] }, ['A', 'B', 'C', 'D', 'E', 'F']);
  S.matches = [];
  let n = 0;
  const add = (a, b, w) =>
    S.matches.push({ id: 'g' + n, n: ++n, c: 1, a, b, started: true, done: true, winner: w, doneAt: n, startedAt: 60000 * n });
  add(['A', 'B'], ['C', 'D'], 'a');
  add(['A', 'B'], ['E', 'F'], 'a');
  add(['A', 'C'], ['B', 'D'], 'a');
  add(['A', 'B'], ['C', 'D'], 'b');
  const w = E2.wrapUp(S);
  assert.equal(w.games, 4);
  assert.equal(w.rows[0].name, 'A');
  assert.equal(w.rows[0].w, 3);
  assert.equal(w.podium.length, 3);
  assert.deepEqual(w.awards.duo.names.slice().sort(), ['A', 'B']);
  assert.equal(w.awards.streak.value, 3);
  assert.equal(w.awards.rivalry.g >= 2, true);
  assert.ok(w.minutes >= 1);
});

test('finishing drops matches up next, keeps games on court, and stops new matches', () => {
  const E2 = require('../js/engine.js');
  const S = E2.newSession({ courts: 2, labels: ['1', '2'] }, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']);
  E2.startMatch(S, S.matches[0].id);
  E2.finishSession(S);
  assert.equal(S.matches.length, 1);
  assert.ok(S.finished);
  assert.deepEqual(E2.fill(S), []);
  E2.resumeSession(S);
  assert.equal(S.finished, null);
  assert.equal(S.matches.length, 2);
});

test('up to five courts run at once without anyone double-booked', () => {
  const E2 = require('../js/engine.js');
  const names = Array.from({ length: 22 }, (_, i) => 'P' + i);
  const S = E2.newSession({ courts: 5, labels: ['1', '2', '3', '4', '5'] }, names);
  assert.equal(S.courts.length, 5);
  assert.equal(S.matches.length, 5);
  const all = S.matches.flatMap((m) => [...m.a, ...m.b]);
  assert.equal(new Set(all).size, 20);
  assert.equal(E2.newSession({ courts: 9, labels: [] }, names).courts.length, 5);
  for (let i = 0; i < 25; i++) {
    const m = S.matches.filter((x) => !x.done)[i % 5];
    E2.startMatch(S, m.id);
    E2.setResult(S, m.id, 'a');
    E2.fill(S);
    const busy = S.matches.filter((x) => !x.done).flatMap((x) => [...x.a, ...x.b]);
    assert.equal(new Set(busy).size, busy.length);
  }
});
