/* ---------- scheduling engine ----------
   Live courts. Nothing is scheduled ahead of time. Each open court holds at most one match.
   When a match is finished, the next one for that court is made on the spot, using only
   players who are free right now, so nobody is put in a match while still on another court.

   A session looks like this:
   { id, created, active: [names], left: [names marked out], baseline: {}, seq: 0,
     courts: [{ label: '5', open: true }],
     matches: [{ id, n, c, a: [x, y], b: [x, y], started, done, winner, startedAt, doneAt }] }
   `c` is the court slot (1 or 2). The number painted on the court is courts[c - 1].label.
   A match is "up next" until it is started, then "playing now", then done. */

/* How much a repeat costs. `balanced` spreads opponents first. `random` ignores who has played
   with or against whom. `partners` spreads teammates first. */
const WEIGHTS = {
  balanced: { p: 5, o: 6 },
  random: { p: 0, o: 0 },
  partners: { p: 20, o: 1 },
};
const weightsFor = (mode) => WEIGHTS[mode] || WEIGHTS.balanced;
const pk = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
let _uid = 0;
const uid = () => 'm' + Date.now().toString(36) + (_uid++).toString(36);
const newSessionId = () => 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function rngFrom(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- history of who played whom ---------- */
function makeStats() {
  return { played: {}, partner: {}, opp: {}, last: {} };
}
function addMatchStats(st, m) {
  for (const p of [...m.a, ...m.b]) {
    st.played[p] = (st.played[p] || 0) + 1;
    st.last[p] = m.n;
  }
  const ka = pk(m.a[0], m.a[1]),
    kb = pk(m.b[0], m.b[1]);
  st.partner[ka] = (st.partner[ka] || 0) + 1;
  st.partner[kb] = (st.partner[kb] || 0) + 1;
  for (const x of m.a)
    for (const y of m.b) {
      const k = pk(x, y);
      st.opp[k] = (st.opp[k] || 0) + 1;
    }
}
/* Counts every match in the session, finished or not. A match that is up next already
   uses its players, so the next match is built around it. */
function statsOf(S) {
  const st = makeStats();
  S.matches.forEach((m) => addMatchStats(st, m));
  return st;
}

/* ---------- picking a match ---------- */
function pairings(arr) {
  if (!arr.length) return [[]];
  const a = arr[0],
    rest = arr.slice(1),
    out = [];
  for (let i = 0; i < rest.length; i++) {
    const rem = rest.filter((_, j) => j !== i);
    for (const p of pairings(rem)) out.push([[a, rest[i]], ...p]);
  }
  return out;
}
const PLAN_CACHE = {};
function plansFor(n) {
  if (PLAN_CACHE[n]) return PLAN_CACHE[n];
  const idx = [...Array(n).keys()],
    out = [];
  const groups = (list) => {
    if (!list.length) return [[]];
    const a = list[0],
      rest = list.slice(1),
      res = [];
    for (let i = 0; i < rest.length; i++) {
      const rem = rest.filter((_, j) => j !== i);
      for (const g of groups(rem)) res.push([[a, rest[i]], ...g]);
    }
    return res;
  };
  for (const prs of pairings(idx))
    for (const g of groups(prs)) out.push(g.map(([x, y]) => [x[0], x[1], y[0], y[1]]));
  return (PLAN_CACHE[n] = out);
}

/* Splits these players into matches of two teams each, trying every split.
   Returns { matches, cost }. A lower cost means fewer repeats. */
function bestPlan(players, st, rnd, W) {
  W = W || WEIGHTS.balanced;
  const n = players.length,
    pl = players.slice();
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [pl[i], pl[j]] = [pl[j], pl[i]];
  }
  const P = [],
    O = [];
  for (let i = 0; i < n; i++) {
    P.push(new Array(n).fill(0));
    O.push(new Array(n).fill(0));
  }
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const k = pk(pl[i], pl[j]);
      P[i][j] = P[j][i] = W.p * (2 * (st.partner[k] || 0) + 1);
      O[i][j] = O[j][i] = W.o * (2 * (st.opp[k] || 0) + 1);
    }
  let best = null,
    bs = Infinity;
  for (const plan of plansFor(n)) {
    let c = rnd() * 1.5;
    for (const m of plan) {
      const a0 = m[0],
        a1 = m[1],
        b0 = m[2],
        b1 = m[3];
      c += P[a0][a1] + P[b0][b1] + O[a0][b0] + O[a0][b1] + O[a1][b0] + O[a1][b1];
    }
    if (c < bs) {
      bs = c;
      best = plan;
    }
  }
  return {
    cost: bs,
    matches: best.map(([a0, a1, b0, b1]) =>
      rnd() < 0.5 ? { a: [pl[a0], pl[a1]], b: [pl[b0], pl[b1]] } : { a: [pl[b0], pl[b1]], b: [pl[a0], pl[a1]] },
    ),
  };
}

/* Lower is more deserving of a game: fewer games played first, then the longest rest. */
function ranking(S, pool, st, nextN, rnd) {
  const open = Math.max(1, S.courts.filter((c) => c.open).length);
  return pool
    .map((p) => {
      const rested = st.last[p] === undefined ? 4 : Math.min((nextN - 1 - st.last[p]) / open, 4);
      return { p, k: ((st.played[p] || 0) + (S.baseline[p] || 0)) * 100 - rested * 8 + rnd() * 12 };
    })
    .sort((x, y) => x.k - y.k);
}

/* One match from the free players. The few most deserving players are tried in every
   combination, so fairness comes first and repeat partners or opponents break the ties. */
function pickOne(S, pool, st, nextN, rnd, W) {
  const top = ranking(S, pool, st, nextN, rnd).slice(0, 7);
  let best = null,
    bs = Infinity;
  for (let i = 0; i < top.length; i++)
    for (let j = i + 1; j < top.length; j++)
      for (let k = j + 1; k < top.length; k++)
        for (let l = k + 1; l < top.length; l++) {
          const set = [top[i], top[j], top[k], top[l]];
          const plan = bestPlan(
            set.map((x) => x.p),
            st,
            rnd,
            W,
          );
          const cost = set.reduce((s, x) => s + x.k, 0) + plan.cost;
          if (cost < bs) {
            bs = cost;
            best = plan.matches[0];
          }
        }
  return [best];
}

/* Several matches at once, used when more than one court is empty. */
function pickMany(S, pool, st, nextN, rnd, W, count) {
  const chosen = ranking(S, pool, st, nextN, rnd)
    .slice(0, count * 4)
    .map((x) => x.p);
  return bestPlan(chosen, st, rnd, W).matches;
}

/* ---------- queries ---------- */
const pendingOn = (S, slot) => S.matches.find((m) => !m.done && m.c === slot) || null;
function busySet(S) {
  const busy = new Set();
  S.matches.forEach((m) => {
    if (!m.done) [...m.a, ...m.b].forEach((p) => busy.add(p));
  });
  return busy;
}
function freePlayers(S) {
  const busy = busySet(S);
  return S.active.filter((p) => !busy.has(p));
}
const isFree = (S, name) => S.active.includes(name) && !busySet(S).has(name);
function locate(S, name) {
  for (const m of S.matches) {
    if (m.done) continue;
    let i = m.a.indexOf(name);
    if (i >= 0) return { m, side: 'a', i };
    i = m.b.indexOf(name);
    if (i >= 0) return { m, side: 'b', i };
  }
  return null;
}
const courtLabel = (S, slot) => (S.courts[slot - 1] ? S.courts[slot - 1].label : String(slot));
function allNames(S) {
  const seen = [];
  const add = (p) => {
    if (!seen.includes(p)) seen.push(p);
  };
  S.active.forEach(add);
  S.matches.forEach((m) => [...m.a, ...m.b].forEach(add));
  (S.left || []).forEach(add);
  return seen;
}
/* Finished matches in the order they were finished. */
const finished = (S) =>
  S.matches.filter((m) => m.done).sort((x, y) => (x.doneAt || 0) - (y.doneAt || 0) || x.n - y.n);

function summarize(S) {
  const per = {};
  allNames(S).forEach((n) => {
    per[n] = { name: n, played: 0, w: 0, l: 0, faced: new Set(), partners: new Set() };
  });
  finished(S).forEach((m) => {
    [...m.a, ...m.b].forEach((p) => {
      per[p].played++;
    });
    m.a.forEach((x) =>
      m.b.forEach((y) => {
        per[x].faced.add(y);
        per[y].faced.add(x);
      }),
    );
    per[m.a[0]].partners.add(m.a[1]);
    per[m.a[1]].partners.add(m.a[0]);
    per[m.b[0]].partners.add(m.b[1]);
    per[m.b[1]].partners.add(m.b[0]);
    if (m.winner) {
      const win = m.winner === 'a' ? m.a : m.b,
        lose = m.winner === 'a' ? m.b : m.a;
      win.forEach((p) => per[p].w++);
      lose.forEach((p) => per[p].l++);
    }
  });
  const act = S.active;
  let faced = 0,
    met = 0;
  act.forEach((p) => {
    act.forEach((q) => {
      if (p !== q) {
        if (per[p].faced.has(q)) faced++;
        if (per[p].partners.has(q)) met++;
      }
    });
  });
  const pairs = act.length * (act.length - 1);
  return {
    per,
    n: act.length,
    oppPct: pairs ? Math.round((faced / pairs) * 100) : 0,
    partnerPct: pairs ? Math.round((met / pairs) * 100) : 0,
    avgFaced: act.length ? Math.round((faced / act.length) * 10) / 10 : 0,
  };
}

/* ---------- making matches ---------- */
/* Gives every open court without a match its next one. Uses only free players, so nobody is
   ever in two matches. Returns the matches that were made. */
function fill(S, mode) {
  const slots = [];
  S.courts.forEach((c, i) => {
    if (c.open && !pendingOn(S, i + 1)) slots.push(i + 1);
  });
  const pool = freePlayers(S);
  const count = Math.min(slots.length, Math.floor(pool.length / 4));
  if (!count) return [];
  const W = weightsFor(mode),
    st = statsOf(S),
    rnd = rngFrom((Math.random() * 4294967296) >>> 0),
    nextN = S.seq + 1;
  const found =
    count === 1 ? pickOne(S, pool, st, nextN, rnd, W) : pickMany(S, pool, st, nextN, rnd, W, count);
  return found.map((m, i) => {
    const made = {
      id: uid(),
      n: ++S.seq,
      c: slots[i],
      a: m.a,
      b: m.b,
      started: false,
      done: false,
      winner: null,
    };
    S.matches.push(made);
    return made;
  });
}

function newSession(cfg, names) {
  const want = Math.min(Math.max(1, cfg.courts | 0 || 1), 2);
  const labels = (cfg.labels || []).slice(0, want);
  const S = {
    id: newSessionId(),
    created: Date.now(),
    active: names.slice(),
    left: [],
    baseline: {},
    seq: 0,
    courts: Array.from({ length: want }, (_, i) => ({ label: String(labels[i] || i + 1), open: true })),
    matches: [],
  };
  fill(S);
  return S;
}

const removeMatch = (S, m) => {
  S.matches = S.matches.filter((x) => x !== m);
};

/* The shuffle button. Matches that are only up next are thrown away and made again.
   Finished and started matches are left alone. mode: 'random' or 'partners'. */
function reroll(S, mode) {
  S.matches = S.matches.filter((m) => m.done || m.started);
  return fill(S, mode);
}

/* ---------- results ---------- */
function startMatch(S, id) {
  const m = S.matches.find((x) => x.id === id);
  if (!m || m.done || m.started) return null;
  m.started = true;
  m.startedAt = Date.now();
  return m;
}
function setResult(S, id, winner) {
  const m = S.matches.find((x) => x.id === id);
  if (!m) return false;
  if (!m.done) {
    m.done = true;
    m.doneAt = Date.now();
  }
  m.started = true;
  m.winner = winner;
  return true;
}
/* A result can be taken back only while it is safe: the court has not started its next match,
   nobody from it is in another match, and no later match has finished on that court. */
function canReopen(S, id) {
  const m = S.matches.find((x) => x.id === id);
  if (!m || !m.done) return false;
  if (S.matches.some((x) => x.c === m.c && x.done && x.n > m.n)) return false;
  const next = pendingOn(S, m.c);
  if (next && next.started) return false;
  const mine = new Set([...m.a, ...m.b]);
  return !S.matches.some((x) => !x.done && x !== next && [...x.a, ...x.b].some((p) => mine.has(p)));
}
function reopen(S, id) {
  if (!canReopen(S, id)) return false;
  const m = S.matches.find((x) => x.id === id),
    next = pendingOn(S, m.c);
  if (next) removeMatch(S, next);
  m.done = false;
  m.winner = null;
  delete m.doneAt;
  return true;
}
const findMatch = (S, id) => S.matches.find((m) => m.id === id) || null;

/* ---------- edits ---------- */
/* Swaps p (in a match that has not started) with q. q is either in another match that has
   not started, or a free player who is on no court. */
function swapPlayers(S, p, q) {
  const lp = locate(S, p);
  if (!lp || lp.m.started) return false;
  const lq = locate(S, q);
  if (lq) {
    if (lq.m.started) return false;
    lp.m[lp.side][lp.i] = q;
    lq.m[lq.side][lq.i] = p;
    return true;
  }
  if (!isFree(S, q)) return false;
  lp.m[lp.side][lp.i] = q;
  return true;
}
/* Corrects who really played in a match, started or finished. The new player must not be in
   this match, and for a match still on court must not be in another unfinished match. */
function replacePlayed(S, id, from, to) {
  const m = findMatch(S, id);
  if (!m || from === to) return false;
  const all = [...m.a, ...m.b];
  if (!all.includes(from) || all.includes(to)) return false;
  if (!m.done && busySet(S).has(to)) return false;
  const side = m.a.includes(from) ? 'a' : 'b';
  m[side][m[side].indexOf(from)] = to;
  if (!(S.active.includes(to) || (S.left || []).includes(to))) S.active.push(to);
  fill(S);
  return true;
}
/* Takes someone off for the rest of the day. If they are in a match that has not started,
   a free player steps in, or the match is dropped and made again. A match already on court
   is left to finish. */
function playerOut(S, name, replacement) {
  const loc = locate(S, name);
  if (loc && !loc.m.started) {
    if (replacement && isFree(S, replacement)) loc.m[loc.side][loc.i] = replacement;
    else removeMatch(S, loc.m);
  }
  S.active = S.active.filter((p) => p !== name);
  S.left = (S.left || []).filter((p) => p !== name).concat(name);
  fill(S);
}
function playerIn(S, name) {
  const st = statsOf(S);
  const others = S.active.map((p) => st.played[p] || 0);
  const mean = others.length ? Math.round(others.reduce((x, y) => x + y, 0) / others.length) : 0;
  const own = st.played[name] || 0;
  /* Treated as if they already had the same number of games as everyone else, so they are
     neither pushed to catch up nor held back. */
  S.baseline[name] = Math.max(0, mean - own);
  if (!S.active.includes(name)) S.active.push(name);
  S.left = (S.left || []).filter((p) => p !== name);
  fill(S);
}
function setCourtOpen(S, slot, open) {
  const c = S.courts[slot - 1];
  if (!c) return false;
  c.open = !!open;
  if (!open) {
    const q = pendingOn(S, slot);
    if (q && !q.started) removeMatch(S, q);
  }
  fill(S);
  return true;
}
function renameInSession(S, from, to) {
  const sw = (x) => (x === from ? to : x);
  S.active = S.active.map(sw);
  S.left = (S.left || []).map(sw);
  S.matches.forEach((m) => {
    m.a = m.a.map(sw);
    m.b = m.b.map(sw);
  });
  if (S.baseline && Object.prototype.hasOwnProperty.call(S.baseline, from)) {
    S.baseline[to] = S.baseline[from];
    delete S.baseline[from];
  }
  return S;
}

/* ---------- older saves ---------- */
/* Sessions saved before live courts had a list of rounds. Finished matches are kept, and the
   matches that were on court or up next stay as up next. Later rounds are dropped. */
function fromLegacy(old) {
  if (!old || typeof old !== 'object' || !Array.isArray(old.active)) return null;
  if (Array.isArray(old.matches) && Array.isArray(old.courts)) return old;
  if (!Array.isArray(old.rounds)) return null;
  const slot = (c) => (c === 2 ? 2 : 1);
  const S = {
    id: typeof old.id === 'string' ? old.id : newSessionId(),
    created: typeof old.created === 'number' ? old.created : Date.now(),
    active: old.active.map(String),
    left: [],
    baseline: Object.assign({}, old.baseline),
    seq: 0,
    courts: [],
    matches: [],
  };
  let courts = Math.min(Math.max(old.courts | 0 || 1, 1), 2);
  const firstOpen = old.rounds.findIndex((rd) => rd.matches.some((m) => !m.done));
  const busy = new Set();
  old.rounds.forEach((rd, r) =>
    rd.matches.forEach((m) => {
      if (!Array.isArray(m.a) || !Array.isArray(m.b) || m.a.length !== 2 || m.b.length !== 2) return;
      const c = slot(m.court);
      if (c === 2) courts = 2;
      const base = { id: m.id || uid(), n: ++S.seq, c, a: m.a.map(String), b: m.b.map(String) };
      if (m.done && (m.winner === 'a' || m.winner === 'b')) {
        S.matches.push({ ...base, started: true, done: true, winner: m.winner, doneAt: S.seq });
      } else if (!m.done && (r === firstOpen || m.live)) {
        const names = base.a.concat(base.b);
        if (names.some((p) => busy.has(p)) || S.matches.some((x) => !x.done && x.c === c)) {
          S.seq--;
          return;
        }
        names.forEach((p) => busy.add(p));
        S.matches.push({ ...base, started: !!m.started, done: false, winner: null });
      } else S.seq--;
    }),
  );
  S.courts = Array.from({ length: courts }, (_, i) => ({ label: String(i + 1), open: true }));
  fill(S);
  return S;
}

if (typeof module !== 'undefined')
  module.exports = {
    WEIGHTS,
    newSession,
    newSessionId,
    fill,
    reroll,
    startMatch,
    setResult,
    reopen,
    canReopen,
    findMatch,
    swapPlayers,
    replacePlayed,
    playerOut,
    playerIn,
    setCourtOpen,
    renameInSession,
    fromLegacy,
    summarize,
    allNames,
    finished,
    freePlayers,
    pendingOn,
    courtLabel,
    locate,
  };
