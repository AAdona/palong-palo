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
