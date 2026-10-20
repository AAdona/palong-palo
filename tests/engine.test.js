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

/* ---- someone arrives late ---- */
test('a late player is scheduled, but does not get extra games to catch up', () => {
  for (let run = 0; run < 8; run++) {
    const S = E.newSession(cfg(2, 180), NAMES.slice(0, 11));
    /* play out the first 3 rounds */
    for (let r = 0; r < 3; r++) S.rounds[r].matches.forEach((m) => E.setResult(S, m.id, 'a', []));
    E.playerIn(S, 'Late');
    E.buildFrom(S, E.curRound(S), 300); /* the Reshuffle button */
    const g = games(S);
    assert.ok(g.Late >= 3, 'late player should be in the schedule, got ' + g.Late);
    const others = NAMES.slice(0, 11).map((n) => g[n]);
    assert.ok(g.Late <= Math.min(...others), 'late player caught up: ' + g.Late + ' vs ' + others.join(','));
  }
});

/* ---- start button and rename ---- */
test('a new session has an id and a start time', () => {
  const S = E.newSession(cfg(2, 180), NAMES);
  assert.ok(S.id && S.created);
});

test('starting a match flags it, keeps it through a reshuffle and cannot be repeated', () => {
  const S = E.newSession(cfg(2, 180), NAMES);
  const m = S.rounds[0].matches[0];
  assert.equal(m.started, undefined);
  assert.ok(E.startMatch(S, m.id));
  assert.equal(m.started, true);
  assert.equal(m.live, true);
  assert.equal(E.startMatch(S, m.id), null, 'second start does nothing');
  const players = m.a.concat(m.b).join();
  E.buildFrom(S, 0, 100);
  const again = S.rounds[0].matches.find((x) => x.id === m.id);
  assert.ok(again, 'started match survives a rebuild');
  assert.equal(again.a.concat(again.b).join(), players);
});

test('a finished match cannot be started', () => {
  const S = E.newSession(cfg(2, 180), NAMES);
  const m = S.rounds[0].matches[0];
  E.setResult(S, m.id, 'a', []);
  assert.equal(E.startMatch(S, m.id), null);
});

test('renaming a player updates matches, rests, the active list and the late baseline', () => {
  const S = E.newSession(cfg(2, 180), NAMES);
  E.playerIn(S, 'Late');
  E.renameInSession(S, 'Late', 'Latecomer');
  E.renameInSession(S, 'Ana', 'Anna');
  assert.ok(S.active.includes('Anna') && !S.active.includes('Ana'));
  assert.ok(S.active.includes('Latecomer') && !S.active.includes('Late'));
  assert.ok(S.baseline.Latecomer !== undefined && S.baseline.Late === undefined);
  const names = E.summarize(S).per;
  assert.ok(names.Anna && !names.Ana);
  const all = S.rounds.flatMap((r) => r.matches.flatMap((m) => m.a.concat(m.b)).concat(r.rest));
  assert.ok(!all.includes('Ana') && !all.includes('Late'));
});

/* ---- reshuffle ---- */
test('reshuffle rebuilds a match that was only queued early, but keeps started ones', () => {
  let changed = 0;
  for (let i = 0; i < 20; i++) {
    const S = E.newSession(cfg(2, 180), NAMES);
    const c1 = S.rounds[0].matches.find((m) => m.court === 1);
    E.setResult(S, c1.id, 'a', []);
    const queued = E.startEarly(S, 0, 1);
    const before = queued.a.concat(queued.b).join();
    E.reshuffle(S, 300);
    const now = S.rounds[1].matches.find((m) => m.court === 1);
    if (now.a.concat(now.b).join() !== before) changed++;
    /* the court is queued again with free players only, so nobody is double booked */
    assert.equal(now.live, true, 'court 1 is running ahead again');
    const busy = inPlay(S);
    assert.equal(new Set(busy).size, busy.length, 'double booked after reshuffle');
  }
  assert.ok(changed >= 10, 'queued match should usually change, changed ' + changed + '/20');

  const S = E.newSession(cfg(2, 180), NAMES);
  const c1 = S.rounds[0].matches.find((m) => m.court === 1);
  E.setResult(S, c1.id, 'a', []);
  const q = E.startEarly(S, 0, 1);
  E.startMatch(S, q.id);
  const kept = q.a.concat(q.b).join();
  E.reshuffle(S, 300);
  const still = S.rounds[1].matches.find((m) => m.id === q.id);
  assert.ok(still && still.a.concat(still.b).join() === kept, 'a started match stays put');
});

/* ---- two kinds of shuffle ---- */
const partnerRepeats = (S) => {
  const c = {};
  S.rounds.forEach((rd) =>
    rd.matches.forEach((m) =>
      [m.a, m.b].forEach((t) => {
        const k = [...t].sort().join('|');
        c[k] = (c[k] || 0) + 1;
      }),
    ),
  );
  return Object.values(c).reduce((s, n) => s + Math.max(0, n - 1), 0);
};
const shuffled = (mode) => {
  const S = E.newSession(cfg(2, 180), NAMES);
  for (let r = 0; r < 2; r++) S.rounds[r].matches.forEach((m) => E.setResult(S, m.id, 'a', []));
  E.reshuffle(S, 150, mode);
  return S;
};

test('fresh partners repeats teammates less than a total shuffle', () => {
  let fresh = 0,
    random = 0;
  const runs = 12;
  for (let i = 0; i < runs; i++) {
    fresh += partnerRepeats(shuffled('partners'));
    random += partnerRepeats(shuffled('random'));
  }
  assert.ok(fresh / runs < random / runs, 'fresh ' + fresh / runs + ' vs random ' + random / runs);
});

test('both shuffles keep finished matches and keep games even', () => {
  for (const mode of ['random', 'partners']) {
    const S = E.newSession(cfg(2, 180), NAMES);
    const first = S.rounds[0].matches.map((m) => m.id + ':' + m.a.concat(m.b).join());
    S.rounds[0].matches.forEach((m) => E.setResult(S, m.id, 'b', []));
    E.reshuffle(S, 150, mode);
    assert.deepEqual(
      S.rounds[0].matches.map((m) => m.id + ':' + m.a.concat(m.b).join()),
      first,
    );
    const g = Object.values(games(S));
    assert.ok(Math.max(...g) - Math.min(...g) <= 1, mode + ' games spread ' + g.join(','));
    S.rounds.forEach((rd) => {
      const seen = rd.matches.flatMap((m) => m.a.concat(m.b));
      assert.equal(new Set(seen).size, seen.length);
    });
  }
});
