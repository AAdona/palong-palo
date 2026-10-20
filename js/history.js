/* ---------- saved results, backups and all-time stats ----------
   No DOM code here. A saved session is a small record of its logged results:
   { id, created, matches: [{ r, c, a: [x, y], b: [x, y], w: 'a' | 'b' }] }
   Names are the identity, the same as in the schedule engine. */
const Archive = (() => {
  const APP = 'palong-palo';
  const VERSION = 1;
  const MAX_SESSIONS = 2000;
  const MAX_MATCHES = 300;
  const MAX_ROSTER = 200;
  const MAX_FILE = 5000000;

  const newId = () => 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const cleanName = (n) => {
    if (typeof n !== 'string') return null;
    const t = n.trim();
    return t && t.length <= 40 ? t : null;
  };
  const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

  /* Turns one stored or imported record into a clean copy, or null if it is not usable. */
  function validateRecord(x) {
    if (!x || typeof x !== 'object') return null;
    const id = typeof x.id === 'string' && x.id.length > 0 && x.id.length <= 64 ? x.id : null;
    if (!id || !Array.isArray(x.matches) || !x.matches.length || x.matches.length > MAX_MATCHES) return null;
    const matches = [];
    for (const m of x.matches) {
      if (!m || !Array.isArray(m.a) || !Array.isArray(m.b) || m.a.length !== 2 || m.b.length !== 2) return null;
      const names = m.a.concat(m.b).map(cleanName);
      if (names.some((n) => n === null) || new Set(names).size !== 4) return null;
      if (m.w !== 'a' && m.w !== 'b') return null;
      matches.push({
        r: num(m.r, 0),
        c: num(m.c, 1),
        a: [names[0], names[1]],
        b: [names[2], names[3]],
        w: m.w,
      });
    }
    return { id, created: num(x.created, 0), matches };
  }
  function cleanList(list) {
    return Array.isArray(list) ? list.slice(0, MAX_SESSIONS).map(validateRecord).filter(Boolean) : [];
  }

  /* Builds the record for a live session, keeping only matches with a logged winner.
     Gives the session an id and start time the first time, so repeat saves share one id. */
  function compactSession(S) {
    if (!S || !Array.isArray(S.rounds)) return null;
    if (!S.id) S.id = newId();
    if (!S.created) S.created = Date.now();
    const matches = [];
    S.rounds.forEach((rd, r) =>
      (rd.matches || []).forEach((m) => {
        if (m.done && (m.winner === 'a' || m.winner === 'b'))
          matches.push({ r, c: m.court, a: m.a.slice(), b: m.b.slice(), w: m.winner });
      }),
    );
    return matches.length ? validateRecord({ id: S.id, created: S.created, matches }) : null;
  }

  /* Adds or replaces one record by id. */
  function upsert(list, rec) {
    const out = list.filter((x) => x.id !== rec.id);
    out.push(rec);
    return out.sort((x, y) => x.created - y.created);
  }

  /* Merges imported records into the saved ones. A session already saved is skipped,
     unless the imported copy has more logged matches (a later save of the same night). */
  function mergeSessions(existing, incoming) {
    let list = existing.slice(),
      added = 0,
      updated = 0,
      skipped = 0;
    incoming.forEach((rec) => {
      const have = list.find((x) => x.id === rec.id);
      if (!have) {
        list = upsert(list, rec);
        added++;
      } else if (rec.matches.length > have.matches.length) {
        list = upsert(list, rec);
        updated++;
      } else skipped++;
    });
    return { list, added, updated, skipped };
  }

  /* Everything that counts for all-time stats: saved sessions plus the one in progress. */
  function allSessions(history, S) {
    const cur = compactSession(S);
    const list = cur ? history.filter((x) => x.id !== cur.id) : history.slice();
    if (cur) list.push(cur);
    return list;
  }

  function buildExport(history, S, roster) {
    return {
      app: APP,
      version: VERSION,
      exportedAt: new Date().toISOString(),
      roster: roster.slice(),
      sessions: allSessions(history, S),
    };
  }

  /* Reads backup text. Returns { sessions, roster, skipped } or { error }. */
  function parseExport(text) {
    if (typeof text !== 'string' || text.length > MAX_FILE) return { error: 'That file is too big to be a backup.' };
    let d;
    try {
      d = JSON.parse(text);
    } catch (e) {
      return { error: 'That file is not a valid backup.' };
    }
    if (!d || d.app !== APP || !Array.isArray(d.sessions)) return { error: 'That is not a Palong Palo backup.' };
    if (typeof d.version !== 'number' || d.version > VERSION)
      return { error: 'That backup is from a newer version of the app.' };
    const sessions = cleanList(d.sessions);
    const seen = new Set();
    const roster = [];
    (Array.isArray(d.roster) ? d.roster.slice(0, MAX_ROSTER) : []).forEach((n) => {
      const c = cleanName(n);
      if (c && !seen.has(c.toLowerCase())) {
        seen.add(c.toLowerCase());
        roster.push(c);
      }
    });
    return { sessions, roster, skipped: Math.min(d.sessions.length, MAX_SESSIONS) - sessions.length };
  }

  /* Renaming A to B would put B twice in a match if A and B ever played the same match. */
  function renameConflict(records, from, to) {
    return records.some((rec) =>
      rec.matches.some((m) => {
        const all = m.a.concat(m.b);
        return all.includes(from) && all.includes(to);
      }),
    );
  }
  function renameInRecords(records, from, to) {
    const sw = (x) => (x === from ? to : x);
    records.forEach((rec) =>
      rec.matches.forEach((m) => {
        m.a = m.a.map(sw);
        m.b = m.b.map(sw);
      }),
    );
    return records;
  }

  /* All-time numbers from a list of records. Maps are used so any name is safe as a key. */
  function computeStats(records) {
    const per = new Map(),
      duos = new Map();
    let matches = 0;
    const who = (n) => {
      if (!per.has(n)) per.set(n, { name: n, w: 0, l: 0, sessions: 0 });
      return per.get(n);
    };
    records.forEach((rec) => {
      const seen = new Set();
      rec.matches.forEach((m) => {
        matches++;
        const win = m.w === 'a' ? m.a : m.b,
          lose = m.w === 'a' ? m.b : m.a;
        win.forEach((n) => {
          who(n).w++;
          seen.add(n);
        });
        lose.forEach((n) => {
          who(n).l++;
          seen.add(n);
        });
        [
          [win, true],
          [lose, false],
        ].forEach(([team, won]) => {
          const names = team.slice().sort();
          const key = names.join('\u0000');
          if (!duos.has(key)) duos.set(key, { names, g: 0, w: 0 });
          const d = duos.get(key);
          d.g++;
          if (won) d.w++;
        });
      });
      seen.forEach((n) => who(n).sessions++);
    });
    const players = [...per.values()]
      .map((p) => ({ ...p, games: p.w + p.l, pct: Math.round((p.w / (p.w + p.l)) * 100) }))
      .sort((x, y) => y.w - x.w || x.l - y.l || x.name.localeCompare(y.name));
    const best = [...duos.values()]
      .filter((d) => d.g >= 3)
      .sort((x, y) => y.w / y.g - x.w / x.g || y.g - x.g || x.names.join().localeCompare(y.names.join()))[0];
    return { players, sessions: records.length, matches, bestDuo: best || null };
  }

  return {
    newId,
    validateRecord,
    cleanList,
    compactSession,
    upsert,
    mergeSessions,
    allSessions,
    buildExport,
    parseExport,
    renameConflict,
    renameInRecords,
    computeStats,
  };
})();
if (typeof module !== 'undefined') module.exports = Archive;
