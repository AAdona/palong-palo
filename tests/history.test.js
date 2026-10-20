const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../js/engine.js');
const A = require('../js/history.js');

const NAMES = ['Ana', 'Ben', 'Cy', 'Dee', 'Eli', 'Fay', 'Gus', 'Hal'];
const cfg = { courts: 2, minutes: 20, wins: [{ len: 60 }, { len: 60 }] };
const played = () => {
  const S = E.newSession(cfg, NAMES);
  S.rounds[0].matches.forEach((m) => E.setResult(S, m.id, 'a', []));
  S.rounds[1].matches.forEach((m) => E.setResult(S, m.id, 'b', []));
  return S;
};
const rec = (id, w = 'a', extra = []) => ({
  id,
  created: 1,
  matches: [{ r: 0, c: 1, a: ['Ana', 'Ben'], b: ['Cy', 'Dee'], w }].concat(extra),
});

test('only matches with a logged winner are saved, and the id stays the same', () => {
  const S = played();
  const a = A.compactSession(S),
    b = A.compactSession(S);
  assert.equal(a.matches.length, 4);
  assert.equal(a.id, S.id);
  assert.equal(b.id, a.id);
  const fresh = E.newSession(cfg, NAMES);
  assert.equal(A.compactSession(fresh), null, 'a session with no results is not saved');
});

test('an old session without an id gets one', () => {
  const S = played();
  delete S.id;
  delete S.created;
  const r = A.compactSession(S);
  assert.ok(r.id && S.id === r.id && S.created);
});

test('export then import gives the same sessions and importing twice adds nothing', () => {
  const S = played();
  const out = A.buildExport([rec('old1')], S, ['Ana', 'Ben']);
  const text = JSON.stringify(out);
  const res = A.parseExport(text);
  assert.ok(!res.error);
  assert.equal(res.sessions.length, 2);
  assert.deepEqual(res.roster, ['Ana', 'Ben']);
  const first = A.mergeSessions([], res.sessions);
  assert.equal(first.added, 2);
  const second = A.mergeSessions(first.list, res.sessions);
  assert.equal(second.added, 0);
  assert.equal(second.skipped, 2);
  assert.equal(second.list.length, 2);
});

test('a later save of the same session replaces the earlier one', () => {
  const early = rec('s1');
  const later = rec('s1', 'a', [{ r: 1, c: 1, a: ['Ana', 'Cy'], b: ['Ben', 'Dee'], w: 'b' }]);
  const m = A.mergeSessions([early], [later]);
  assert.equal(m.updated, 1);
  assert.equal(m.list[0].matches.length, 2);
  const back = A.mergeSessions(m.list, [early]);
  assert.equal(back.skipped, 1);
  assert.equal(back.list[0].matches.length, 2);
});

test('the session in progress is counted once, even if an older copy is saved', () => {
  const S = played();
  const copy = A.compactSession(S);
  const list = A.allSessions([copy], S);
  assert.equal(list.length, 1);
});

test('bad files are rejected with a message', () => {
  assert.ok(A.parseExport('not json').error);
  assert.ok(A.parseExport('{"app":"other","sessions":[]}').error);
  assert.ok(A.parseExport('{"app":"palong-palo","version":99,"sessions":[]}').error);
  assert.ok(A.parseExport(JSON.stringify([1, 2])).error);
});

test('unusable records are dropped and counted, good ones are kept', () => {
  const good = rec('g1');
  const dupPlayers = { id: 'bad1', created: 1, matches: [{ a: ['Ana', 'Ana'], b: ['Cy', 'Dee'], w: 'a' }] };
  const noWinner = { id: 'bad2', created: 1, matches: [{ a: ['Ana', 'Ben'], b: ['Cy', 'Dee'], w: 'x' }] };
  const res = A.parseExport(
    JSON.stringify({ app: 'palong-palo', version: 1, sessions: [good, dupPlayers, noWinner, null, 'x'] }),
  );
  assert.equal(res.sessions.length, 1);
  assert.equal(res.skipped, 4);
});

test('odd names cannot break the stats', () => {
  const r = { id: 'x', created: 1, matches: [{ a: ['__proto__', 'constructor'], b: ['toString', 'Dee'], w: 'a' }] };
  const clean = A.validateRecord(r);
  const st = A.computeStats([clean]);
  assert.equal(st.players.length, 4);
  assert.equal(st.players.find((p) => p.name === '__proto__').w, 1);
});

test('stats count wins, losses, sessions and the best duo', () => {
  const r1 = rec('a1', 'a');
  const r2 = rec('a2', 'a');
  const r3 = rec('a3', 'b');
  const st = A.computeStats([r1, r2, r3]);
  const ana = st.players.find((p) => p.name === 'Ana');
  assert.deepEqual([ana.w, ana.l, ana.games, ana.sessions, ana.pct], [2, 1, 3, 3, 67]);
  assert.equal(st.sessions, 3);
  assert.equal(st.matches, 3);
  assert.deepEqual(st.bestDuo.names, ['Ana', 'Ben']);
  assert.equal(st.bestDuo.w, 2);
  assert.equal(A.computeStats([r1, r2]).bestDuo, null, 'needs 3 games together');
});

test('renaming changes saved results and blocks a clash inside one match', () => {
  const list = [rec('r1')];
  assert.equal(A.renameConflict(list, 'Ana', 'Ben'), true);
  assert.equal(A.renameConflict(list, 'Ana', 'Zed'), false);
  A.renameInRecords(list, 'Ana', 'Zed');
  assert.deepEqual(list[0].matches[0].a, ['Zed', 'Ben']);
});
