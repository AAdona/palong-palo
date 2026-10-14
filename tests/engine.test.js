const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../js/engine.js');

const NAMES = ['Ana', 'Ben', 'Cy', 'Dee', 'Eli', 'Fay', 'Gus', 'Hal', 'Ivy', 'Jo', 'Kim', 'Lee'];
const cfg = (courts, len) => ({ courts, minutes: 20, wins: [{ len }, { len }] });
const games = (S) => {
  const g = Object.fromEntries(S.active.map((n) => [n, 0]));
  S.rounds.forEach((r) => r.matches.forEach((m) => m.a.concat(m.b).forEach((n) => g[n]++)));
  return g;
};

test('builds 9 rounds for 3 hours at 20 minutes', () => {
  const S = E.newSession(cfg(2, 180), NAMES);
  assert.equal(S.rounds.length, 9);
});

test('nobody plays twice in a round and every match has four players', () => {
  const S = E.newSession(cfg(2, 180), NAMES);
  for (const r of S.rounds) {
    const seen = r.matches.flatMap((m) => m.a.concat(m.b));
    assert.equal(new Set(seen).size, seen.length);
    r.matches.forEach((m) => assert.equal(m.a.length + m.b.length, 4));
  }
});

test('games played stay within one of each other', () => {
  const S = E.newSession(cfg(2, 180), NAMES);
  const g = Object.values(games(S));
  assert.ok(Math.max(...g) - Math.min(...g) <= 1);
});

test('adding a round and an hour extends the session', () => {
  const S = E.newSession(cfg(2, 120), NAMES);
  const before = S.rounds.length;
  E.extendBy(S, 20);
  assert.equal(S.rounds.length, before + 1);
  E.extendBy(S, 60);
  assert.equal(S.rounds.length, before + 4);
});

test('skipping one court for one round leaves other rounds alone', () => {
  const S = E.newSession(cfg(2, 180), NAMES);
  E.setCourtAt(S, 2, 3, false);
  assert.equal(S.rounds[3].matches.length, 1);
  assert.equal(S.rounds[2].matches.length, 2);
  assert.equal(S.rounds[4].matches.length, 2);
  E.setCourtAt(S, 2, 3, true);
  assert.equal(S.rounds[3].matches.length, 2);
});

test('deleting a round shortens the session and keeps results', () => {
  const S = E.newSession(cfg(2, 180), NAMES);
  const first = S.rounds[0].matches[0];
  E.setResult(S, first.id, 'a', []);
  assert.ok(E.deleteRound(S, 4));
  assert.equal(S.rounds.length, 8);
  assert.equal(E.findMatch(S, first.id).m.winner, 'a');
});

test('cannot delete the last remaining round', () => {
  const S = E.newSession(cfg(1, 20), NAMES.slice(0, 4));
  assert.equal(S.rounds.length, 1);
  assert.equal(E.deleteRound(S, 0), false);
});

/* ---- early start when one court finishes first ---- */
const inPlay = (S) => {
  /* players in matches that are being played right now: pending matches of the current round, plus live ones */
  const cur = E.curRound(S);
  const set = [];
  S.rounds.forEach((rd, r) =>
    rd.matches.forEach((m) => {
      if (!m.done && (r === cur || m.live)) set.push(...m.a, ...m.b);
    }),
  );
  return set;
};

test('court 2 starts its next match early with only free players', () => {
  const S = E.newSession(cfg(2, 180), NAMES);
  const c2 = S.rounds[0].matches.find((m) => m.court === 2);
  E.setResult(S, c2.id, 'a', []);
  const started = E.startEarly(S, 0, 2);
  assert.ok(started, 'a match should start');
  assert.equal(started.court, 2);
  assert.equal(started.live, true);
  const busy = inPlay(S);
  assert.equal(new Set(busy).size, busy.length, 'nobody is in two matches at once');
});

test('early starts never double-book anyone and keep games even', () => {
  for (let run = 0; run < 15; run++) {
    const S = E.newSession(cfg(2, 180), NAMES);
    let guard = 0;
    while (S.rounds.some((rd) => rd.matches.some((m) => !m.done)) && guard++ < 200) {
      const cur = E.curRound(S);
      const pending = [];
      S.rounds.forEach((rd, r) =>
        rd.matches.forEach((m) => {
          if (!m.done && (r === cur || m.live)) pending.push(m);
        }),
      );
      if (!pending.length) break;
      /* finish a random pending match, sometimes the second court first */
      const m = pending[Math.floor(Math.random() * pending.length)];
      E.setResult(S, m.id, 'a', []);
      const r = E.findMatch(S, m.id).r;
      if (!S.rounds[r].matches.every((x) => x.done)) E.startEarly(S, r, m.court);
      const busy = inPlay(S);
      assert.equal(new Set(busy).size, busy.length, 'double booked in run ' + run);
      S.rounds.forEach((rd) => {
        const seen = rd.matches.flatMap((x) => x.a.concat(x.b));
        assert.equal(new Set(seen).size, seen.length, 'duplicate player in a round');
      });
    }
    const g = Object.values(games(S));
    assert.ok(Math.max(...g) - Math.min(...g) <= 2, 'games spread too wide: ' + g.join(','));
  }
});
