/* ---------- scheduling engine ---------- */
/* How much a repeat costs. `balanced` is the normal schedule: opponents are spread first.
   `random` ignores who has played with or against whom. `partners` spreads teammates first. */
const WEIGHTS = {
  balanced: { p: 5, o: 6 },
  random: { p: 0, o: 0 },
  partners: { p: 20, o: 1 },
};
const weightsFor = (mode) => WEIGHTS[mode] || WEIGHTS.balanced;
const hm = (s) => {
  const [h, m] = String(s || '09:00')
    .split(':')
    .map(Number);
  return (h || 0) * 60 + (m || 0);
};
const hmStr = (min) =>
  String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
const pk = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
let _uid = 0;
const uid = () => 'm' + Date.now().toString(36) + (_uid++).toString(36);

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

function makeStats() {
  return { played: {}, partner: {}, opp: {}, lastPlayed: {} };
}
function cloneStats(s) {
  return {
    played: { ...s.played },
    partner: { ...s.partner },
    opp: { ...s.opp },
    lastPlayed: { ...s.lastPlayed },
  };
}
function addMatchStats(st, m, r) {
  for (const p of [...m.a, ...m.b]) {
    st.played[p] = (st.played[p] || 0) + 1;
    st.lastPlayed[p] = r;
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
function statsFrom(rounds, upTo) {
  const st = makeStats();
  for (let r = 0; r < upTo && r < rounds.length; r++)
    rounds[r].matches.forEach((m) => addMatchStats(st, m, r));
  return st;
}

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
  for (const prs of pairings(idx)) {
    // group the pairs into matches
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
    for (const g of groups(prs)) out.push(g.map(([x, y]) => [x[0], x[1], y[0], y[1]]));
  }
  return (PLAN_CACHE[n] = out);
}

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
      c +=
        P[a0][a1] +
        P[b0][b1] +
        O[a0][b0] +
        O[a0][b1] +
        O[a1][b0] +
        O[a1][b1];
    }
    if (c < bs) {
      bs = c;
      best = plan;
    }
  }
  return best.map(([a0, a1, b0, b1]) =>
    rnd() < 0.5 ? { a: [pl[a0], pl[a1]], b: [pl[b0], pl[b1]] } : { a: [pl[b0], pl[b1]], b: [pl[a0], pl[a1]] },
  );
}

function planRound(active, st, kept, courts, r, rnd, base, W) {
  const keptSet = new Set();
  kept.forEach((m) => [...m.a, ...m.b].forEach((p) => keptSet.add(p)));
  const pool = active.filter((p) => !keptSet.has(p));
  const total = Math.min(courts, Math.floor(active.length / 4));
  const need = Math.max(0, Math.min(total - kept.length, Math.floor(pool.length / 4)));
  if (!need) return { matches: [], rest: pool.slice() };
  const key = (p) => {
    const lp = st.lastPlayed[p] === undefined ? -3 : st.lastPlayed[p];
    const gap = Math.min(Math.max(r - 1 - lp, 0), 4);
    return ((st.played[p] || 0) + (base[p] || 0)) * 100 - gap * 8 + rnd() * 12;
  };
  const ranked = pool
    .map((p) => ({ p, k: key(p) }))
    .sort((x, y) => x.k - y.k)
    .map((x) => x.p);
  const playing = ranked.slice(0, need * 4);
  const rest = ranked.slice(need * 4);
  return { matches: bestPlan(playing, st, rnd, W), rest };
}

function scoreStats(st, names, base, W) {
  W = W || WEIGHTS.balanced;
  let s = 0;
  for (const k in st.partner) s += W.p * st.partner[k] ** 2;
  for (const k in st.opp) s += W.o * st.opp[k] ** 2;
  const pl = names.map((n) => (st.played[n] || 0) + ((base && base[n]) || 0));
  const mean = pl.reduce((a, b) => a + b, 0) / (pl.length || 1);
  s += 60 * pl.reduce((a, b) => a + (b - mean) ** 2, 0);
  return s;
}

function framed(wins, courts) {
  const lens = wins.slice(0, courts).map((w) => w.len),
    top = Math.max(...lens);
  return lens.map((l) => ({ start: top - l, end: top }));
}
function startMinOf(S) {
  return S.startMin !== undefined ? S.startMin : hm(S.start);
}
function winsOf(S) {
  if (S.courtWins) return S.courtWins;
  const st = hm(S.start);
  return Array.from({ length: S.courts }, () => ({ start: st, end: st + S.totalRounds * S.minutes }));
}
function courtsFor(S, r) {
  const t0 = startMinOf(S) + r * S.minutes,
    out = [];
  const off = (S.off && S.off[r]) || [];
  winsOf(S).forEach((w, i) => {
    if (w.start <= t0 && t0 + S.minutes <= w.end && !off.includes(i + 1)) out.push(i + 1);
  });
  return out;
}
function planSlots(wins, courts, minutes) {
  const w = framed(wins, courts);
  if (!w.length || w.some((x) => x.end <= x.start)) return { rounds: 0, counts: [] };
  const s = Math.min(...w.map((x) => x.start)),
    en = Math.max(...w.map((x) => x.end));
  const rounds = Math.floor((en - s) / minutes),
    counts = [];
  for (let r = 0; r < rounds; r++) {
    const t0 = s + r * minutes;
    counts.push(w.filter((x) => x.start <= t0 && t0 + minutes <= x.end).length);
  }
  return { rounds, counts };
}

function buildFrom(S, from, attempts, mode) {
  attempts = attempts || 200;
  const W = weightsFor(mode);
  if (from >= S.totalRounds) {
    S.rounds = S.rounds.slice(0, S.totalRounds);
    return S;
  }
  const baseSt = statsFrom(S.rounds, from);
  let best = null,
    bs = Infinity;
  for (let t = 0; t < attempts; t++) {
    const rnd = rngFrom((Math.random() * 4294967296) >>> 0);
    const st = cloneStats(baseSt),
      built = [];
    for (let r = from; r < S.totalRounds; r++) {
      const old = S.rounds[r];
      const kept = old ? old.matches.filter((m) => m.done || m.live) : [];
      kept.forEach((m) => addMatchStats(st, m, r));
      const avail = courtsFor(S, r);
      const res = planRound(S.active, st, kept, avail.length, r, rnd, S.baseline || {}, W);
      res.matches.forEach((m) => addMatchStats(st, m, r));
      built.push({ kept, res, avail });
    }
    const sc = scoreStats(st, S.active, S.baseline, W);
    if (sc < bs) {
      bs = sc;
      best = built;
    }
  }
  const rounds = S.rounds.slice(0, from);
  best.forEach(({ kept, res, avail }) => {
    const used = new Set(kept.map((m) => m.court));
    const free = avail.filter((c) => !used.has(c));
    const top = Math.max(0, ...used, ...avail);
    const fresh = res.matches.map((m, i) => ({
      id: uid(),
      court: free[i] !== undefined ? free[i] : top + 1 + i,
      a: m.a,
      b: m.b,
      done: false,
      winner: null,
      sets: [],
    }));
    rounds.push({ matches: kept.concat(fresh).sort((x, y) => x.court - y.court), rest: res.rest });
  });
  S.rounds = rounds;
  return S;
}

function newSession(cfg, names) {
  const wins = framed(cfg.wins, cfg.courts);
  const start = Math.min(...wins.map((w) => w.start)),
    end = Math.max(...wins.map((w) => w.end));
  const S = {
    id: 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    created: Date.now(),
    active: names.slice(),
    courts: cfg.courts,
    minutes: cfg.minutes,
    start: '00:00',
    startMin: start,
    courtWins: wins,
    totalRounds: Math.max(1, Math.floor((end - start) / cfg.minutes)),
    rounds: [],
    baseline: {},
  };
  return buildFrom(S, 0, 300);
}

/* ---------- queries ---------- */
function curRound(S) {
  const i = S.rounds.findIndex((rd) => rd.matches.some((m) => !m.done));
  return i < 0 ? Math.max(0, S.rounds.length - 1) : i;
}
function allNames(S) {
  const seen = [];
  const add = (p) => {
    if (!seen.includes(p)) seen.push(p);
  };
  S.active.forEach(add);
  S.rounds.forEach((rd) => {
    rd.matches.forEach((m) => [...m.a, ...m.b].forEach(add));
    rd.rest.forEach(add);
  });
  return seen;
}
function summarize(S) {
  const per = {};
  allNames(S).forEach((n) => {
    per[n] = { name: n, played: 0, rests: 0, w: 0, l: 0, faced: new Set(), partners: new Set() };
  });
  S.rounds.forEach((rd) => {
    rd.matches.forEach((m) => {
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
      if (m.done && m.winner) {
        const win = m.winner === 'a' ? m.a : m.b,
          lose = m.winner === 'a' ? m.b : m.a;
        win.forEach((p) => per[p].w++);
        lose.forEach((p) => per[p].l++);
      }
    });
    rd.rest.forEach((p) => {
      if (per[p]) per[p].rests++;
    });
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

/* ---------- manual edits ---------- */
function findPlayer(round, name) {
  for (const m of round.matches) {
    let i = m.a.indexOf(name);
    if (i >= 0) return { m, side: 'a', i };
    i = m.b.indexOf(name);
    if (i >= 0) return { m, side: 'b', i };
  }
  const ri = round.rest.indexOf(name);
  return ri >= 0 ? { rest: true, i: ri } : null;
}
function setAt(round, loc, name) {
  if (loc.rest) round.rest[loc.i] = name;
  else loc.m[loc.side][loc.i] = name;
}
function swapPlayers(S, r, p, q) {
  const round = S.rounds[r],
    lp = findPlayer(round, p),
    lq = findPlayer(round, q);
  if (!lp || !lq || (lp.m && lp.m.done) || (lq.m && lq.m.done)) return false;
  setAt(round, lp, q);
  setAt(round, lq, p);
  buildFrom(S, r + 1, 150);
  return true;
}
function dropMatchFor(S, r, name, out) {
  const round = S.rounds[r],
    loc = findPlayer(round, name);
  if (!loc || !loc.m || loc.m.done) return false;
  round.matches = round.matches.filter((m) => m !== loc.m);
  [...loc.m.a, ...loc.m.b].forEach((p) => {
    if (!(out && p === name)) round.rest.push(p);
  });
  return true;
}
function playerOut(S, name, r, replacement) {
  const round = S.rounds[r];
  const loc = round && findPlayer(round, name);
  if (loc && loc.m && !loc.m.done) {
    if (replacement && round.rest.includes(replacement)) {
      const rl = findPlayer(round, replacement);
      setAt(round, loc, replacement);
      round.rest.splice(rl.i, 1);
    } else dropMatchFor(S, r, name, true);
  } else if (loc && loc.rest) round.rest.splice(loc.i, 1);
  S.active = S.active.filter((p) => p !== name);
  buildFrom(S, r + 1, 150);
}
function playerIn(S, name) {
  const r = curRound(S);
  /* Count only games up to now. Counting the whole future schedule would make the late
     player look hugely "ahead" and he would barely get to play. */
  const st = statsFrom(S.rounds, r + 1);
  const others = S.active.map((p) => st.played[p] || 0);
  const mean = others.length ? Math.round(others.reduce((x, y) => x + y, 0) / others.length) : 0;
  const own = st.played[name] || 0;
  S.baseline = S.baseline || {};
  /* Treated as if he already had the same number of games as everyone else. He is neither
     pushed to catch up nor held back. */
  S.baseline[name] = Math.max(0, mean - own);
  S.active.push(name);
  if (S.rounds[r] && !findPlayer(S.rounds[r], name)) S.rounds[r].rest.push(name);
  buildFrom(S, r + 1, 150);
}
function extendBy(S, mins) {
  const before = S.rounds.length;
  const wins0 = winsOf(S),
    endAll = Math.max(...wins0.map((w) => w.end));
  S.courtWins = wins0.map((w) => ({
    start: w.start,
    end: w.start < w.end && w.end === endAll ? w.end + mins : w.end,
  }));
  const end = Math.max(...S.courtWins.map((w) => w.end));
  S.totalRounds = Math.max(before, Math.floor((end - startMinOf(S)) / S.minutes));
  while (S.rounds.length < S.totalRounds) S.rounds.push({ matches: [], rest: [] });
  buildFrom(S, before, 150);
  return S.rounds.length - before;
}
function setCourt(S, c, open) {
  const cur = curRound(S),
    t = startMinOf(S) + cur * S.minutes,
    endAll = startMinOf(S) + S.totalRounds * S.minutes;
  const wins = winsOf(S).map((w) => ({ start: w.start, end: w.end }));
  while (wins.length < c) wins.push({ start: endAll, end: endAll });
  wins[c - 1] = open
    ? { start: t, end: endAll }
    : { start: wins[c - 1].start, end: Math.min(wins[c - 1].end, t) };
  S.courtWins = wins;
  S.courts = Math.max(S.courts, wins.length);
  buildFrom(S, cur, 150);
}
function setCourtAt(S, c, r, open) {
  S.off = S.off || {};
  const list = (S.off[r] || []).filter((x) => x !== c);
  if (!open) list.push(c);
  if (list.length) S.off[r] = list;
  else delete S.off[r];
  buildFrom(S, r, 150);
}
function isOffAt(S, c, r) {
  return !!(S.off && S.off[r] && S.off[r].includes(c));
}
function deleteRound(S, r) {
  if (S.rounds.length < 2 || r < 0 || r >= S.rounds.length) return false;
  const m = S.minutes,
    t = startMinOf(S) + r * m;
  const sh = (x) => (x > t ? Math.max(t, x - m) : x);
  S.courtWins = winsOf(S).map((w) => ({ start: sh(w.start), end: sh(w.end) }));
  const off = {};
  Object.keys(S.off || {}).forEach((k) => {
    k = +k;
    if (k < r) off[k] = S.off[k];
    else if (k > r) off[k - 1] = S.off[k];
  });
  S.off = off;
  S.rounds.splice(r, 1);
  S.totalRounds = S.rounds.length;
  buildFrom(S, r, 150);
  return true;
}
function courtState(S, c) {
  const cur = curRound(S);
  if (courtsFor(S, cur).includes(c)) return { on: true };
  const w = winsOf(S)[c - 1],
    t = startMinOf(S) + cur * S.minutes;
  if (w && w.start > t) {
    for (let q = cur + 1; q < S.rounds.length; q++)
      if (courtsFor(S, q).includes(c)) return { on: false, soon: q + 1 };
  }
  return { on: false };
}
/* A court finished before the other one. Start that court's next match now, using only
   players who are free. Returns the match that was started, or null if none could be.
   The match is flagged `live`, so later rebuilds keep it where it is. */
function startEarly(S, r, c, mode) {
  const W = weightsFor(mode);
  const q = r + 1;
  if (r !== curRound(S) || q >= S.rounds.length) return null;
  const here = S.rounds[r],
    next = S.rounds[q];
  if (!courtsFor(S, q).includes(c)) return null;
  if (next.matches.some((m) => m.court === c && (m.done || m.live))) return null;

  const busy = new Set();
  const hold = (m) => [...m.a, ...m.b].forEach((p) => busy.add(p));
  here.matches.filter((m) => !m.done).forEach(hold);
  S.rounds.forEach((rd) => rd.matches.filter((m) => m.live && !m.done).forEach(hold));
  next.matches.filter((m) => m.done || m.live).forEach(hold);
  const free = S.active.filter((p) => !busy.has(p));
  if (free.length < 4) return null;

  const planned = next.matches.find((m) => m.court === c);
  if (planned && [...planned.a, ...planned.b].every((p) => free.includes(p))) {
    planned.live = true;
    return planned;
  }

  const st = statsFrom(S.rounds, q);
  let best = null,
    bestScore = Infinity;
  for (let t = 0; t < 25; t++) {
    const res = planRound(free, st, [], 1, q, rngFrom((Math.random() * 4294967296) >>> 0), S.baseline || {}, W);
    if (!res.matches.length) return null;
    const trial = cloneStats(st);
    addMatchStats(trial, res.matches[0], q);
    const score = scoreStats(trial, S.active, S.baseline, W);
    if (score < bestScore) {
      bestScore = score;
      best = res.matches[0];
    }
  }
  const started = {
    id: uid(),
    court: c,
    a: best.a,
    b: best.b,
    done: false,
    winner: null,
    sets: [],
    live: true,
  };
  next.matches = next.matches.filter((m) => m.court !== c).concat(started);
  buildFrom(S, q, 120, mode);
  return findMatch(S, started.id).m;
}

/* The Reshuffle button. Keeps finished and started matches. A match that was only queued
   early on a free court is not being played yet, so it is rebuilt with the rest. Courts
   that were already running ahead are then queued again, using only players who are free. */
function reshuffle(S, attempts, mode) {
  const cur = curRound(S);
  const queued = [];
  S.rounds.forEach((rd, q) =>
    rd.matches.forEach((m) => {
      if (m.live && !m.started && !m.done) {
        if (q === cur + 1) queued.push(m.court);
        delete m.live;
      }
    }),
  );
  buildFrom(S, cur, attempts || 300, mode);
  queued.forEach((c) => {
    const here = S.rounds[cur] && S.rounds[cur].matches.find((m) => m.court === c);
    if (here && here.done) startEarly(S, cur, c, mode);
  });
  return S;
}

/* Marks a match as started: the players are on court now. Until then a match is only
   "up next". It is also flagged `live`, so later rebuilds keep it exactly where it is. */
function startMatch(S, id) {
  const f = findMatch(S, id);
  if (!f || f.m.done || f.m.started) return null;
  f.m.started = true;
  f.m.live = true;
  f.m.startedAt = Date.now();
  return f.m;
}

/* Renames a player everywhere in a session: active list, every match, rests, late-player baseline. */
function renameInSession(S, from, to) {
  const sw = (x) => (x === from ? to : x);
  S.active = S.active.map(sw);
  S.rounds.forEach((rd) => {
    rd.matches.forEach((m) => {
      m.a = m.a.map(sw);
      m.b = m.b.map(sw);
    });
    rd.rest = rd.rest.map(sw);
  });
  if (S.baseline && Object.prototype.hasOwnProperty.call(S.baseline, from)) {
    S.baseline[to] = S.baseline[from];
    delete S.baseline[from];
  }
  return S;
}

function setResult(S, id, winner, sets) {
  for (const rd of S.rounds)
    for (const m of rd.matches)
      if (m.id === id) {
        m.done = true;
        m.winner = winner;
        m.sets = sets;
        return true;
      }
  return false;
}
function reopen(S, id) {
  for (const rd of S.rounds)
    for (const m of rd.matches)
      if (m.id === id) {
        m.done = false;
        m.winner = null;
        m.sets = [];
        return true;
      }
  return false;
}
function findMatch(S, id) {
  for (let r = 0; r < S.rounds.length; r++)
    for (const m of S.rounds[r].matches) if (m.id === id) return { m, r };
  return null;
}
if (typeof module !== 'undefined')
  module.exports = {
    startEarly,
    startMatch,
    reshuffle,
    renameInSession,
    setCourtAt,
    deleteRound,
    isOffAt,
    setCourt,
    courtState,
    courtsFor,
    planSlots,
    newSession,
    buildFrom,
    summarize,
    swapPlayers,
    playerOut,
    playerIn,
    extendBy,
    curRound,
    setResult,
    findMatch,
  };
