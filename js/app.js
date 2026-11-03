/* ---------- app ---------- */
const KEY = 'monday-doubles.v1';
const HKEY = 'palong-palo.history.v1';
const DEFAULT_ROSTER = [
  'Gelay',
  'Adi',
  'Bajeng',
  'Gelo',
  'Deyb',
  'Sarah',
  'Peton',
  'Eula',
  'Yuyi',
  'JJ',
];
const App = {
  view: 'setup',
  roster: DEFAULT_ROSTER.slice(),
  picked: new Set(DEFAULT_ROSTER),
  cfg: { courts: 2, labels: ['1', '2'] },
  S: null,
  history: [],
  sheet: null,
  sheetNew: false,
  toast: null,
  undo: null,
  anim: null,
  busy: false,
  opener: null,
};
const $app = document.getElementById('app');
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const fmtNum = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

const I = {
  check:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 4.8"/></svg>',
  close:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15"/></svg>',
  prev: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4l-6 6 6 6"/></svg>',
  next: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 4l6 6-6 6"/></svg>',
  menu: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><circle cx="4.5" cy="10" r="1.6"/><circle cx="10" cy="10" r="1.6"/><circle cx="15.5" cy="10" r="1.6"/></svg>',
  people:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="7.5" cy="7" r="3"/><path d="M2 16c.6-3 2.7-4.5 5.5-4.5S12.400 13 13 16"/><path d="M13 4.200a3 3 0 010 5.600M15 11.800c1.800.5 2.800 1.800 3 4.200"/></svg>',
  list: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M7 5h9M7 10h9M7 15h9"/><circle cx="3.500" cy="5" r="0.900" fill="currentColor"/><circle cx="3.500" cy="10" r="0.900" fill="currentColor"/><circle cx="3.500" cy="15" r="0.900" fill="currentColor"/></svg>',
  plus: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M10 4v12M4 10h12"/></svg>',
  shuffle:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h3c4 0 4 8 8 8h3M3 14h3c1.5 0 2.500-.8 3.300-1.900M11 7.100C11.800 6.400 12.800 6 14 6h3M15 3.500L17.500 6 15 8.500M15 11.500l2.500 2.500-2.500 2.500"/></svg>',
  roundplus:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="3" y="3" width="14" height="14" rx="4"/><path d="M10 7v6M7 10h6"/></svg>',
  court:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="M6.800 10h6.400"/></svg>',
  trash:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h12M8 6V4h4v2M6 6l.7 10h6.600L14 6M8.500 9v4M11.500 9v4"/></svg>',
  sun: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="3.500"/><path d="M10 2.500v2M10 15.500v2M2.500 10h2M15.500 10h2M4.700 4.700l1.400 1.400M13.900 13.900l1.400 1.400M15.300 4.700l-1.400 1.400M6.100 13.900l-1.400 1.400"/></svg>',
  moon: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16.500 11.500A6.500 6.500 0 018.500 3.500a6.500 6.500 0 108 8z"/></svg>',
  auto: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="6.500"/><path d="M10 3.500v13a6.500 6.500 0 000-13z" fill="currentColor"/></svg>',
  stats:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 16V9M10 16V4M16 16v-5"/></svg>',
  soundOn:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8v4h3l4 3.500v-11L6 8H3z"/><path d="M13 7.500a3.500 3.500 0 010 5M15.500 5.500a6.500 6.500 0 010 9"/></svg>',
  soundOff:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8v4h3l4 3.500v-11L6 8H3z"/><path d="M13.500 8l4 4M17.500 8l-4 4"/></svg>',
  play: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M6.500 4.500v11l9-5.500z"/></svg>',
  dot: '<svg viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="3.2" fill="currentColor"/></svg>',
  brand:
    '<svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><circle cx="8" cy="20" r="4.2" style="fill:var(--color-forest)"/><path d="M11 17L22 6M12.500 19.500L24 11M9 14L17 4" style="stroke:var(--color-court-deep)" stroke-width="2" stroke-linecap="round"/></svg>',
};

const COURT_LINES =
  '<rect x="0" y="0" width="134" height="61"/><line x1="0" y1="4.6" x2="134" y2="4.6"/><line x1="0" y1="56.4" x2="134" y2="56.4"/>' +
  '<line x1="47.2" y1="0" x2="47.2" y2="61"/><line x1="86.8" y1="0" x2="86.8" y2="61"/><line x1="7.6" y1="0" x2="7.6" y2="61"/><line x1="126.4" y1="0" x2="126.4" y2="61"/>' +
  '<line x1="0" y1="30.5" x2="47.2" y2="30.5"/><line x1="86.8" y1="30.5" x2="134" y2="30.5"/>';
const COURT_SVG =
  '<svg viewBox="-4 -4 142 69" aria-hidden="true" focusable="false">' +
  '<rect x="-4" y="-4" width="142" height="69" rx="4" fill="var(--color-cream)"/>' +
  '<g class="court-surface"><rect x="0" y="0" width="134" height="61" fill="var(--court-fill)"/></g>' +
  '<g class="court-lines" fill="none" stroke="var(--court-line)" stroke-width="0.7" stroke-linejoin="round">' +
  COURT_LINES +
  '</g>' +
  '<line class="net" x1="67" y1="-2.500" x2="67" y2="63.500" stroke-opacity="0.5" stroke-width="1.100" stroke-dasharray="1.600 1"/>' +
  '</svg>';
const BG_COURT =
  '<svg class="bg-court" viewBox="-4 -4 142 69" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="0.8">' +
  COURT_LINES +
  '<line x1="67" y1="-3" x2="67" y2="64"/></g></svg>';

/* ---------- persistence ---------- */
function save() {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        roster: App.roster,
        picked: [...App.picked],
        cfg: App.cfg,
        S: App.S,
        view: App.view,
        mig: 1,
      }),
    );
  } catch (e) {
    /* storage unavailable */
  }
}
function saveHistory() {
  try {
    localStorage.setItem(HKEY, JSON.stringify(App.history));
  } catch (e) {
    /* storage unavailable */
  }
}
function loadHistory() {
  try {
    const raw = localStorage.getItem(HKEY);
    if (raw) App.history = Archive.cleanList(JSON.parse(raw));
  } catch (e) {
    /* ignore broken history */
  }
}
function load() {
  loadHistory();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (Array.isArray(d.roster) && d.roster.length) App.roster = d.roster.map(String);
    /* One time: Angel is no longer on the default list. Saves from before that still have her. */
    if (d.mig !== 1) App.roster = App.roster.filter((n) => n !== 'Angel');
    if (Array.isArray(d.picked)) App.picked = new Set(d.picked.filter((n) => App.roster.includes(n)));
    if (d.cfg && typeof d.cfg === 'object') {
      if (d.cfg.courts === 1 || d.cfg.courts === 2) App.cfg.courts = d.cfg.courts;
      if (Array.isArray(d.cfg.labels))
        App.cfg.labels = [0, 1].map((i) => cleanLabel(d.cfg.labels[i]) || String(i + 1));
      if (App.cfg.labels[0] === App.cfg.labels[1]) App.cfg.labels = ['1', '2'];
    }
    /* A session saved before live courts is converted. Its finished games are kept. */
    const S = d.S ? fromLegacy(d.S) : null;
    if (S && Array.isArray(S.matches) && Array.isArray(S.courts) && S.courts.length) {
      App.S = S;
      App.view = d.view === 'schedule' ? 'schedule' : 'setup';
    }
  } catch (e) {
    /* ignore broken saves */
  }
}

/* ---------- views ---------- */
/* A court number: digits only, 1 to 99. Returns '' when it is not usable. */
const cleanLabel = (v) => {
  const n = parseInt(String(v == null ? '' : v).replace(/\D/g, ''), 10);
  return n >= 1 && n <= 99 ? String(n) : '';
};
function courtInputs(prefix, labels, count) {
  return Array.from({ length: count }, (_, i) =>
    (
      '<label class="cnum"><span>Court</span><input id="' +
      prefix +
      i +
      '" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2" value="' +
      esc(labels[i]) +
      '" autocomplete="off" aria-label="Number of court ' +
      (i + 1) +
      '"></label>'
    ),
  ).join('');
}

function setupHTML() {
  const n = App.picked.size,
    courts = App.cfg.courts;
  const use = Math.min(courts, Math.floor(n / 4));
  const ok = n >= 4;
  let sum;
  if (!ok) sum = '<p class="summary warn" role="status">Pick at least 4 players.</p>';
  else {
    const rest = n - use * 4;
    sum =
      '<p class="summary' +
      (use < courts ? ' warn' : '') +
      '" role="status"><b>' +
      use * 4 +
      ' play</b>' +
      (rest ? ' and <b>' + rest + ' rest</b>' : '') +
      ' at a time.' +
      (use < courts
        ? ' Only ' + use + (use === 1 ? ' court' : ' courts') + ' can run with this many players.'
        : ' The next match for a court is made when its game finishes.') +
      '</p>';
  }
  const chips =
    App.roster
      .map(
        (name) =>
          '<button class="pchip" data-act="pick" data-name="' +
          esc(name) +
          '" aria-pressed="' +
          App.picked.has(name) +
          '">' +
          I.check.replace('<svg', '<svg class="tick"') +
          '<span>' +
          esc(name) +
          '</span></button>',
      )
      .join('') +
    '<button class="pchip add" data-act="open-roster" aria-label="Add, rename or remove players">' +
    I.plus.replace('<svg', '<svg style="width:16px;height:16px;flex:none"') +
    '<span>Add</span></button>';
  const all = App.picked.size === App.roster.length;
  return (
    '<div class="shell">' +
    '<header class="top"><div class="brand">' +
    I.brand +
    '<span>Palong Palo</span></div>' +
    '<div class="actions">' +
    (App.S ? '<button class="btn sm quiet" data-act="resume">Back to session</button>' : '') +
    '<button class="btn quiet icon" data-act="theme-cycle" aria-label="Theme: ' +
    Theme.pref +
    '" title="Theme: ' +
    Theme.pref +
    '">' +
    (Theme.pref === 'dark' ? I.moon : Theme.pref === 'light' ? I.sun : I.auto) +
    '</button>' +
    '<button class="btn quiet icon" data-act="sound" aria-label="Sound ' +
    (Sound.enabled ? 'on' : 'off') +
    '" aria-pressed="' +
    Sound.enabled +
    '" title="Sound">' +
    (Sound.enabled ? I.soundOn : I.soundOff) +
    '</button></div>' +
    '</header>' +
    '<main class="main">' +
    '<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:8px"><div><h1 class="setup-title">Who is playing today?</h1><p class="setup-sub">' +
    n +
    ' of ' +
    App.roster.length +
    ' picked</p></div>' +
    '<button class="btn sm quiet" data-act="pick-all">' +
    (all ? 'Clear all' : 'Pick all') +
    '</button></div>' +
    '<div class="roster"><div class="chips">' +
    chips +
    '</div></div>' +
    '<div class="controls">' +
    '<div class="field wide"><span class="lbl" id="l-courts">Courts</span><div class="seg" role="radiogroup" aria-labelledby="l-courts">' +
    [1, 2]
      .map(
        (c) =>
          '<button role="radio" aria-checked="' +
          (courts === c) +
          '" data-act="courts" data-v="' +
          c +
          '">' +
          c +
          '</button>',
      )
      .join('') +
    '</div></div>' +
    '<div class="field wide"><span class="lbl">Court numbers</span><div class="cnums">' +
    courtInputs('cn', App.cfg.labels, courts) +
    '</div></div>' +
    '</div>' +
    sum +
    '<button class="btn quiet histlink" data-act="open-history">' +
    I.stats +
    'Saved results and backup</button>' +
    '</main>' +
    '<footer class="foot"><button class="btn primary" data-act="generate"' +
    (!ok || App.busy ? ' disabled' : '') +
    ' style="min-height:50px">' +
    (App.busy ? '<span class="spin"></span>Setting up' : 'Start session') +
    '</button></footer></div>'
  );
}

function matchText(m) {
  return m.a.join(' + ') + ' vs ' + m.b.join(' + ');
}

/* A court with a match: up next until Start game is pressed, then playing now. */
function matchCard(S, m) {
  const slot = m.c,
    c = S.courts[slot - 1],
    label = courtLabel(S, slot);
  const badge = m.started ? ['now', 'Playing now'] : ['', 'Up next'];
  const pill = (name, side, k) => {
    const left = side === 'a' ? '26.4%' : '73.6%',
      top = k === 0 ? '27.9%' : '72.1%';
    return (
      '<button class="pill t-' +
      side +
      '" style="left:' +
      left +
      ';top:' +
      top +
      '" data-act="player" data-name="' +
      esc(name) +
      '"' +
      (m.started ? ' disabled' : '') +
      ' aria-label="' +
      esc(name) +
      ', team ' +
      side.toUpperCase() +
      (m.started ? '' : '. Change player') +
      '">' +
      '<span>' +
      esc(name) +
      '</span></button>'
    );
  };
  const ctl =
    S.courts.length > 1
      ? c.open
        ? '<button class="btn quiet icon sm" data-act="court-close" data-c="' +
          slot +
          '" aria-label="Close court ' +
          label +
          '" title="Close court ' +
          label +
          '">' +
          I.court +
          '</button>'
        : '<button class="btn quiet icon sm" data-act="court-open" data-c="' +
          slot +
          '" aria-label="Open court ' +
          label +
          ' again" title="Open court ' +
          label +
          ' again">' +
          I.plus +
          '</button>'
      : '';
  const main = m.started
    ? '<button class="btn sm" data-act="result" data-id="' + m.id + '">Pick winner</button>'
    : '<button class="btn sm primary" data-act="start" data-id="' + m.id + '">' + I.play + 'Start game</button>';
  return (
    '<article class="match" aria-label="Court ' +
    label +
    '">' +
    '<header class="match-h"><div class="match-t"><span class="court-n">Court ' +
    label +
    '</span><span class="badge ' +
    badge[0] +
    '">' +
    I.dot +
    badge[1] +
    '</span>' +
    (c.open ? '' : '<span class="endi">Last game here</span>') +
    '</div><div class="mh-a">' +
    ctl +
    main +
    '</div></header>' +
    '<div class="court-slot"><div class="court">' +
    COURT_SVG +
    pill(m.a[0], 'a', 0) +
    pill(m.a[1], 'a', 1) +
    pill(m.b[0], 'b', 0) +
    pill(m.b[1], 'b', 1) +
    '</div></div></article>'
  );
}

/* A court with no match yet: waiting for four free players, or closed. */
function idleCard(S, slot) {
  const c = S.courts[slot - 1],
    label = courtLabel(S, slot),
    free = freePlayers(S).length;
  return (
    '<article class="match idle" aria-label="Court ' +
    label +
    '"><header class="match-h"><div class="match-t"><span class="court-n">Court ' +
    label +
    '</span><span class="badge">' +
    (c.open ? 'Waiting' : 'Closed') +
    '</span></div>' +
    (S.courts.length > 1 && !c.open
      ? '<div class="mh-a"><button class="btn sm" data-act="court-open" data-c="' +
        slot +
        '">Open court</button></div>'
      : '') +
    '</header><p class="note idle-note">' +
    (c.open
      ? 'Needs 4 free players, ' + free + ' free right now. The match is made as soon as there are enough.'
      : 'No new matches here until you open it again.') +
    '</p></article>'
  );
}

function scheduleHTML() {
  const S = App.S,
    sm = summarize(S),
    done = finished(S);
  const courts =
    '<div class="courts' +
    (S.courts.length < 2 ? ' one' : '') +
    '">' +
    S.courts
      .map((c, i) => {
        const m = pendingOn(S, i + 1);
        return m ? matchCard(S, m) : idleCard(S, i + 1);
      })
      .join('') +
    '</div>';
  const free = freePlayers(S);
  const queued = S.matches.some((m) => !m.done && !m.started);
  const rest =
    '<section class="rest" aria-label="Resting">' +
    (free.length
      ? '<span class="rest-l">Resting</span>' +
        free
          .map(
            (p) =>
              '<button class="rchip" data-act="player" data-name="' +
              esc(p) +
              '"' +
              (queued ? '' : ' disabled') +
              ' aria-label="' +
              esc(p) +
              ', ' +
              sm.per[p].played +
              ' played">' +
              esc(p) +
              '<span class="gc">' +
              sm.per[p].played +
              '</span></button>',
          )
          .join('')
      : '<span class="note">Everyone is on court.</span>') +
    '</section>';
  const team = (m, side) => {
    const won = m.winner === side;
    return (
      '<span class="tm ' +
      (won ? 'w' : 'l') +
      '">' +
      (won ? I.check : '') +
      esc((side === 'a' ? m.a : m.b).join(' + ')) +
      '</span>'
    );
  };
  const rows = done
    .map((m, i) => ({ m, num: i + 1 }))
    .reverse()
    .map(
      ({ m, num }) =>
        '<button class="urow played" data-act="result" data-id="' +
        m.id +
        '"><b>Game ' +
        num +
        '<small>Court ' +
        esc(courtLabel(S, m.c)) +
        '</small></b><span class="pm">' +
        team(m, 'a') +
        '<i class="vs">vs</i>' +
        team(m, 'b') +
        '</span></button>',
    )
    .join('');
  const played =
    '<section class="played" aria-label="Played games"><h3>Played' +
    (done.length ? ', ' + done.length : '') +
    '</h3>' +
    (rows || '<p class="note">Finished games show up here. Tap one to change its winner.</p>') +
    '</section>';
  return (
    '<div class="shell">' +
    '<header class="top sched"><div class="brand">' +
    I.brand +
    '<span>Palong Palo</span></div><div class="actions">' +
    '<button class="btn quiet icon" data-act="stats" aria-label="Stats" title="Stats">' +
    I.stats +
    '</button>' +
    '<button class="btn quiet icon" data-act="shuffle" aria-label="Shuffle the matches up next" title="Shuffle the matches up next"' +
    (queued ? '' : ' disabled') +
    '>' +
    I.shuffle +
    '</button>' +
    '<button class="btn quiet icon" data-act="menu" aria-label="More" title="More">' +
    I.menu +
    '</button></div></header>' +
    '<main class="main live">' +
    '<div class="roundbar"><div class="roundrow"><h1 class="roundtitle">On court<small>' +
    done.length +
    (done.length === 1 ? ' game' : ' games') +
    ' played, ' +
    sm.n +
    ' players</small></h1></div></div>' +
    courts +
    rest +
    played +
    '</main>' +
    '<footer class="foot"><div class="footnav two">' +
    '<button class="btn" data-act="players">' +
    I.people +
    'Players</button>' +
    '<button class="btn" data-act="full">' +
    I.list +
    'Standings</button></div></footer></div>'
  );
}

/* ---------- sheets ---------- */
function sheetShell(title, sub, body, extra) {
  return (
    '<div class="scrim' +
    (App.sheetNew ? '' : ' open') +
    '" data-act="close"></div>' +
    '<div class="sheet' +
    (extra ? ' ' + extra : '') +
    (App.sheetNew ? '' : ' open') +
    '" role="dialog" aria-modal="true" aria-label="' +
    esc(title) +
    '" tabindex="-1">' +
    '<div class="sheet-h"><h2>' +
    esc(title) +
    (sub ? '<small>' + esc(sub) + '</small>' : '') +
    '</h2><button class="btn quiet icon" data-act="close" aria-label="Close">' +
    I.close +
    '</button></div>' +
    '<div class="sheet-b">' +
    body +
    '</div></div>'
  );
}

function changeSheet(sh) {
  const S = App.S,
    per = summarize(S).per;
  const pl = (p) => (per[p] ? per[p].played : 0);
  const loc = locate(S, sh.name);
  const queued = S.matches.filter((m) => !m.done && !m.started);
  const cand = (p, sub, cls, act) =>
    '<button class="cand ' +
    (cls || '') +
    '" data-act="' +
    act +
    '" data-with="' +
    esc(p) +
    '"><b>' +
    esc(p) +
    '</b><small>' +
    esc(sub) +
    '</small></button>';
  if (!loc) {
    /* Someone resting. Bring them in instead of a player whose match has not started. */
    const list = queued
      .flatMap((m) =>
        [...m.a, ...m.b].map((p) =>
          cand(p, 'Court ' + courtLabel(S, m.c) + ', ' + pl(p) + ' played', '', 'swap'),
        ),
      )
      .join('');
    return sheetShell(
      'Bring in ' + sh.name,
      pl(sh.name) + ' played',
      '<div class="group"><h3>Who sits out instead?</h3><div class="cands">' + list + '</div></div>',
    );
  }
  const m = loc.m;
  if (m.started) return '';
  const out = sh.mode === 'out';
  const free = freePlayers(S).filter((p) => p !== sh.name);
  let body =
    '<div class="seg mode" role="radiogroup" aria-label="How long">' +
    '<button role="radio" aria-checked="' +
    !out +
    '" data-act="mode" data-v="rest">Rest this match</button>' +
    '<button role="radio" aria-checked="' +
    out +
    '" data-act="mode" data-v="out">Out for today</button></div>';
  if (free.length) {
    body +=
      '<div class="group"><h3>' +
      (out ? 'Who takes ' + esc(sh.name) + '’s spot?' : 'Replace with someone resting') +
      '</h3><div class="cands">' +
      free.map((p) => cand(p, pl(p) + ' played', 'free', out ? 'out' : 'swap')).join('') +
      '</div></div>';
  } else {
    body +=
      '<div class="group"><p class="note">Nobody is resting, so there is no one to step in.' +
      (out ? ' The match is made again when four players are free.' : '') +
      '</p>' +
      (out ? '<button class="btn" data-act="out" data-with="">Out for today</button>' : '') +
      '</div>';
  }
  if (!out) {
    const others = [];
    queued.forEach((mm) =>
      [...mm.a, ...mm.b].forEach((p) => {
        if (p === sh.name) return;
        let sub = 'Court ' + courtLabel(S, mm.c);
        if (mm === m) sub = m.a.includes(p) === m.a.includes(sh.name) ? 'Partner' : 'Opponent';
        others.push(cand(p, sub, '', 'swap'));
      }),
    );
    if (others.length)
      body +=
        '<div class="group"><h3>Swap with someone up next</h3><div class="cands">' +
        others.join('') +
        '</div></div>';
  }
  return sheetShell(sh.name, 'Court ' + courtLabel(S, m.c) + ', ' + pl(sh.name) + ' played', body);
}

function resultSheet(sh) {
  const S = App.S,
    m = findMatch(S, sh.id);
  if (!m) return '';
  const wb = (side) =>
    '<button class="winbtn t-' +
    side +
    '" data-act="win" data-side="' +
    side +
    '" aria-pressed="' +
    (m.winner === side) +
    '"><small>Team ' +
    side.toUpperCase() +
    ' won</small><b>' +
    esc((side === 'a' ? m.a : m.b).join(' + ')) +
    '</b>' +
    I.check +
    '</button>';
  let extra = '';
  if (m.done)
    extra = canReopen(S, m.id)
      ? '<button class="btn quiet danger" data-act="reopen">Clear winner</button>'
      : '<p class="note">The court has moved on, so this winner can be changed but not cleared.</p>';
  return sheetShell(
    'Court ' + courtLabel(S, m.c),
    'Best of 3 to 15',
    '<div class="group"><h3>Tap the winning team</h3>' + wb('a') + wb('b') + '</div>' + extra,
  );
}

function overall(S) {
  const per = summarize(S).per;
  return Object.values(per)
    .filter((p) => p.w + p.l > 0)
    .sort((x, y) => y.w - x.w || x.l - y.l || x.name.localeCompare(y.name));
}

function fullSheet() {
  const S = App.S,
    rows = overall(S);
  let rank;
  if (!rows.length)
    rank =
      '<p class="note">No winners logged yet. Pick a winner on each game and the standings show up here.</p>';
  else {
    const top = rows.filter((p) => p.w === rows[0].w && p.l === rows[0].l);
    let place = 0,
      prev = null;
    rank =
      '<p class="lead">Leading: <b>' +
      (top.length > 4
        ? top.length + ' players tied'
        : top.length > 1
          ? top
              .slice(0, -1)
              .map((p) => esc(p.name))
              .join(', ') +
            ' and ' +
            esc(top[top.length - 1].name)
          : esc(top[0].name)) +
      '</b> (' +
      top[0].w +
      (top[0].w === 1 ? ' win' : ' wins') +
      ')</p>' +
      '<div class="rank" role="table" aria-label="Standings">' +
      rows
        .map((p, i) => {
          const key = p.w + '-' + p.l;
          if (key !== prev) {
            place = i + 1;
            prev = key;
          }
          return (
            '<div class="rk" role="row"><span class="num">' +
            place +
            '</span><span class="nm">' +
            esc(p.name) +
            '</span><span class="num">' +
            p.w +
            '-' +
            p.l +
            '</span></div>'
          );
        })
        .join('') +
      '</div>';
  }
  const n = finished(S).length;
  return sheetShell(
    'Standings',
    n + (n === 1 ? ' game' : ' games') + ' played',
    '<div class="group">' + rank + '</div>',
    'tall',
  );
}

function playersSheet() {
  const S = App.S,
    sm = summarize(S);
  const names = allNames(S);
  const rows = names
    .map((n) => {
      const p = sm.per[n],
        on = S.active.includes(n);
      return (
        '<div class="prow' +
        (on ? '' : ' off') +
        '"><span class="nm">' +
        esc(n) +
        '</span><span class="num">' +
        p.played +
        '</span><span class="num">' +
        p.w +
        '-' +
        p.l +
        '</span>' +
        '<span class="num">' +
        (on ? p.faced.size + '/' + (sm.n - 1) : '') +
        '</span>' +
        '<button class="sw" role="switch" aria-checked="' +
        on +
        '" aria-label="' +
        esc(n) +
        ' is playing" data-act="toggle-active" data-name="' +
        esc(n) +
        '">' +
        (on ? 'In' : 'Out') +
        '</button></div>'
      );
    })
    .join('');
  const body =
    '<p class="note">Opponents: everyone faces <b style="color:var(--color-ink)">' +
    fmtNum(sm.avgFaced) +
    ' of ' +
    Math.max(sm.n - 1, 0) +
    '</b> others on average (' +
    sm.oppPct +
    '%). Partners: ' +
    sm.partnerPct +
    '%.</p>' +
    '<div role="table" aria-label="Players"><div class="prow head" role="row"><span>Player</span><span class="num">Games</span><span class="num">W-L</span><span class="num">Faces</span><span class="num">Status</span></div>' +
    rows +
    '</div>' +
    '<form id="f-late" class="addrow"><input id="latename" type="text" placeholder="Add a late player" autocomplete="off" aria-label="Late player name" maxlength="20"><button class="btn" type="submit">' +
    I.plus +
    'Add</button></form>' +
    '<p class="note">Switching someone Out keeps them out of new matches. A game they are already playing finishes first. A late player can be picked for the next match.</p>' +
    '<button class="btn quiet" data-act="open-roster">Rename or edit players list</button>';
  return sheetShell('Players', sm.n + ' playing today', body);
}

function menuSheet() {
  const S = App.S,
    sm = summarize(S);
  const body =
    '<div class="group"><h3>Theme</h3><div class="seg three icons" role="radiogroup" aria-label="Theme">' +
    [
      ['light', 'Light', I.sun],
      ['dark', 'Dark', I.moon],
      ['system', 'Match my phone', I.auto],
    ]
      .map(
        ([v, l, icon]) =>
          '<button role="radio" aria-checked="' +
          (Theme.pref === v) +
          '" aria-label="' +
          l +
          '" title="' +
          l +
          '" data-act="theme" data-v="' +
          v +
          '">' +
          icon +
          '</button>',
      )
      .join('') +
    '</div></div>' +
    '<div class="group"><div class="rrow"><span>Sound<small class="cs">Tap sounds and small buzzes</small></span>' +
    '<button class="sw" role="switch" aria-checked="' +
    Sound.enabled +
    '" aria-label="Sound" data-act="sound">' +
    (Sound.enabled ? 'On' : 'Off') +
    '</button></div></div>' +
    '<div class="menu"><button class="btn" data-act="open-courts">Court numbers</button>' +
    '<button class="btn" data-act="open-history">Saved results and backup</button>' +
    '<button class="btn" data-act="setup">Back to setup</button>' +
    '<button class="btn danger" data-act="ask-new">Start a new session</button></div>' +
    '<p class="note">Opponent coverage is ' +
    sm.oppPct +
    '% and partner coverage is ' +
    sm.partnerPct +
    '%.</p>';
  return sheetShell('Session', S.active.length + ' players', body);
}

function courtsSheet() {
  const S = App.S;
  return sheetShell(
    'Court numbers',
    'Match the numbers on your courts',
    '<form id="f-courts" class="addrow"><div class="cnums">' +
      courtInputs(
        'sc',
        S.courts.map((c) => c.label),
        S.courts.length,
      ) +
      '</div><button class="btn primary" type="submit">Save</button></form>' +
      '<p class="note">Numbers only, 1 to 99. Each court needs its own number.</p>',
  );
}

function rosterSheet(sh) {
  const rows = App.roster
    .map((n) =>
      n === sh.editing
        ? '<form id="f-rename" class="rrow edit" data-from="' +
          esc(n) +
          '"><input id="renameinp" type="text" value="' +
          esc(n) +
          '" autocomplete="off" maxlength="20" aria-label="New name for ' +
          esc(n) +
          '"><button class="btn sm primary" type="submit">Save</button>' +
          '<button class="btn sm quiet" type="button" data-act="rename-cancel">Cancel</button></form>'
        : '<div class="rrow"><span>' +
          esc(n) +
          '</span><div class="mh-a"><button class="btn sm quiet" data-act="rename-start" data-name="' +
          esc(n) +
          '" aria-label="Rename ' +
          esc(n) +
          '">Rename</button><button class="btn sm quiet danger" data-act="roster-del" data-name="' +
          esc(n) +
          '" aria-label="Remove ' +
          esc(n) +
          '">Remove</button></div></div>',
    )
    .join('');
  return sheetShell(
    'Players list',
    'Add a guest, rename or remove someone',
    '<form id="f-roster" class="addrow"><input id="rname" type="text" placeholder="Name" autocomplete="off" aria-label="New player name" maxlength="20"><button class="btn primary" type="submit">Add</button></form><div>' +
      rows +
      '</div>' +
      '<p class="note">Renaming also updates the current schedule and your saved results.</p>',
  );
}

function historySheet() {
  const all = Archive.allSessions(App.history, App.S);
  const st = Archive.computeStats(all);
  let body;
  if (!st.matches) {
    body =
      '<p class="note">No results saved yet. Every winner you pick counts here, and a session is kept when you start a new one.</p>';
  } else {
    let place = 0,
      prev = null;
    const rows = st.players
      .map((p, i) => {
        const key = p.w + '-' + p.l;
        if (key !== prev) {
          place = i + 1;
          prev = key;
        }
        return (
          '<div class="rk rk4" role="row"><span class="num">' +
          place +
          '</span><span class="nm">' +
          esc(p.name) +
          '</span><span class="num">' +
          p.w +
          '-' +
          p.l +
          '</span><span class="num">' +
          p.pct +
          '%</span></div>'
        );
      })
      .join('');
    body =
      '<div class="tiles"><div class="tile"><span>Sessions</span><b>' +
      st.sessions +
      '</b></div><div class="tile"><span>Matches logged</span><b>' +
      st.matches +
      '</b></div></div>' +
      (st.bestDuo
        ? '<div class="tiles one"><div class="tile hi"><span>Best duo</span><b>' +
          st.bestDuo.names.map(esc).join(' + ') +
          '</b><small>' +
          st.bestDuo.w +
          ' wins in ' +
          st.bestDuo.g +
          ' games together</small></div></div>'
        : '') +
      '<div class="group"><h3>All-time wins and losses</h3><div class="rank" role="table" aria-label="All-time results">' +
      rows +
      '</div>' +
      (App.S && Archive.compactSession(App.S)
        ? '<p class="note">Includes the session in progress.</p>'
        : '') +
      '</div>';
  }
  body +=
    '<div class="group"><h3>Backup</h3><p class="note">Results are kept in this browser only. Save a backup file now and then. Importing one adds its sessions and skips the ones already here, so it also moves results to another phone.</p>' +
    '<div class="cands"><button class="btn" data-act="export">Save backup</button>' +
    '<button class="btn" data-act="import">Import backup</button></div>' +
    '<button class="btn quiet danger" data-act="ask-clear-history"' +
    (App.history.length ? '' : ' disabled') +
    '>Clear saved results</button></div>';
  return sheetShell('Saved results', 'All sessions on this phone', body, 'tall');
}

function shuffleSheet() {
  const opt = (mode, title, text) =>
    '<button class="cand" data-act="shuffle-do" data-mode="' +
    mode +
    '"><b>' +
    title +
    '</b><small>' +
    text +
    '</small></button>';
  return sheetShell(
    'Shuffle the matches up next',
    'Games already started or finished stay as they are',
    '<div class="cands" style="grid-template-columns:1fr">' +
      opt('random', 'Total shuffle', 'Random teams and opponents. Players who have played fewer games still come first.') +
      opt(
        'partners',
        'Fresh partners',
        'Pairs people who have been teammates the fewest times, or never. Opponents come second.',
      ) +
      '</div>',
  );
}

function sheetHTML() {
  const sh = App.sheet;
  if (!sh) return '';
  if (sh.type === 'change') return changeSheet(sh);
  if (sh.type === 'result') return resultSheet(sh);
  if (sh.type === 'players') return playersSheet();
  if (sh.type === 'full') return fullSheet();
  if (sh.type === 'menu') return menuSheet();
  if (sh.type === 'roster') return rosterSheet(sh);
  if (sh.type === 'history') return historySheet();
  if (sh.type === 'shuffle') return shuffleSheet();
  if (sh.type === 'courts') return courtsSheet();
  if (sh.type === 'stats') return statsSheet();
  return '';
}
/* ---------- render ---------- */
function render() {
  const hadSheet = !!$app.querySelector('.sheet');
  $app.innerHTML =
    BG_COURT + (App.view === 'setup' || !App.S ? setupHTML() : scheduleHTML()) + sheetHTML() + confirmHTML();
  if (App.anim) {
    const main = $app.querySelector('.main');
    if (main) {
      [...main.children].forEach((c, i) => c.style.setProperty('--i', i));
      main.classList.add('enter');
    }
    App.anim = null;
  }
  if (App.sheet) {
    const sc = $app.querySelector('.scrim'),
      sh = $app.querySelector('.sheet');
    if (App.sheetNew && sc && sh) {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          sc.classList.add('open');
          sh.classList.add('open');
        }),
      );
      App.sheetNew = false;
      sh.focus({ preventScroll: true });
    }
  }
  if (App.sheet && App.sheet.editing) {
    const ri = document.getElementById('renameinp');
    if (ri) {
      ri.focus({ preventScroll: true });
      ri.select();
    }
  }
  if (App.confirm) {
    const dlg = $app.querySelector('.dlg');
    if (dlg) dlg.focus({ preventScroll: true });
  }
}
/* ---------- toast ----------
   The toast lives in its own layer outside #app, so redrawing the screen never touches it.
   It removes itself after TOAST_MS, and the CSS also fades it out as a backup. */
const TOAST_MS = 3000;
const toastHost = document.createElement('div');
document.body.appendChild(toastHost);
let toastTimer = null;
function showToast(msg, undo) {
  clearTimeout(toastTimer);
  toastHost.innerHTML =
    '<div class="toast" role="status"><span>' +
    esc(msg) +
    '</span>' +
    (undo ? '<button data-act="undo">Undo</button>' : '') +
    '</div>';
  toastTimer = setTimeout(hideToast, TOAST_MS);
}
function showLoading(msg) {
  clearTimeout(toastTimer);
  toastHost.innerHTML =
    '<div class="toast loading" role="status" aria-live="polite"><span class="spin"></span><span>' +
    esc(msg) +
    '…</span></div>';
}
function hideToast(instant) {
  clearTimeout(toastTimer);
  const el = toastHost.firstElementChild;
  if (!el) return;
  if (instant === true) {
    toastHost.innerHTML = '';
    return;
  }
  el.classList.add('out');
  setTimeout(() => {
    if (toastHost.firstElementChild === el) toastHost.innerHTML = '';
  }, 200);
}
toastHost.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  Sound.unlock();
  Sound.tap();
  App.lastAct = el.dataset.act;
  onAction(el.dataset.act, el);
});
function openerSel(el) {
  if (!el || !el.dataset || !el.dataset.act) return null;
  let s = '[data-act="' + el.dataset.act + '"]';
  if (el.dataset.name) s += '[data-name="' + CSS.escape(el.dataset.name) + '"]';
  if (el.dataset.id) s += '[data-id="' + el.dataset.id + '"]';
  return s;
}
/* Changes the theme with a soft top-to-bottom reveal. Falls back to a plain color fade. */
function switchTheme(next) {
  const change = () => {
    Theme.set(next);
    render();
  };
  const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (calm) return change();
  if (document.startViewTransition) {
    document.startViewTransition(change);
  } else {
    const root = document.documentElement;
    root.classList.add('theme-fade');
    change();
    setTimeout(() => root.classList.remove('theme-fade'), 400);
  }
}
function openSheet(sheet, from) {
  App.opener = openerSel(from);
  hideToast(true);
  App.sheet = sheet;
  App.sheetNew = true;
  render();
}
function closeSheet() {
  App.sheet = null;
  App.sheetNew = false;
  render();
  if (App.opener) {
    const el = $app.querySelector(App.opener);
    if (el) el.focus({ preventScroll: true });
    App.opener = null;
  }
}
/* Sound cue per action. Anything not listed gets the soft one. */
const CUES = {
  win: 'ok',
  'court-open': 'ok',
  'court-close': 'warn',
  out: 'warn',
};

/* Runs an edit. The loader toast is painted first, so the tap feels instant
   even though rebuilding the schedule takes a moment. */
function mutate(fn, msg, closeIt) {
  if (App.working) return;
  App.working = true;
  if (closeIt !== false) {
    App.sheet = null;
    App.sheetNew = false;
  }
  showLoading('Updating');
  render();
  requestAnimationFrame(() =>
    setTimeout(() => {
      try {
        App.undo = JSON.stringify(App.S);
        fn();
        showToast(typeof msg === 'function' ? msg() : msg, true);
        (Sound[CUES[App.lastAct]] || Sound.soft).call(Sound);
      } catch (e) {
        hideToast(true);
      }
      App.working = false;
      save();
      render();
    }, 0),
  );
}

/* Confirmation dialog for deletes. opts: { title, body, label, act, run } */
function askConfirm(opts) {
  App.confirm = opts;
  render();
}
function confirmHTML() {
  const c = App.confirm;
  if (!c) return '';
  return (
    '<div class="scrim open" data-act="confirm-no" style="z-index:20"></div>' +
    '<div class="dlg" role="alertdialog" aria-modal="true" aria-labelledby="dlg-t" aria-describedby="dlg-b" tabindex="-1">' +
    '<h2 id="dlg-t">' +
    esc(c.title) +
    '</h2><p id="dlg-b">' +
    esc(c.body) +
    '</p>' +
    '<div class="dlg-a"><button class="btn" data-act="confirm-no">Cancel</button>' +
    '<button class="btn danger" data-act="confirm-yes">' +
    esc(c.label) +
    '</button></div></div>'
  );
}

/* Games per player: all games assigned so far, and how many are finished. */
function gameStats(S) {
  const per = {};
  allNames(S).forEach(
    (n) => (per[n] = { name: n, total: 0, done: 0, late: ((S.baseline || {})[n] || 0) > 0 }),
  );
  S.matches.forEach((m) =>
    m.a.concat(m.b).forEach((p) => {
      per[p].total++;
      if (m.done) per[p].done++;
    }),
  );
  return Object.values(per)
    .filter((p) => p.total > 0 || S.active.includes(p.name))
    .sort((x, y) => y.total - x.total || y.done - x.done || x.name.localeCompare(y.name));
}
function statsSheet() {
  const S = App.S,
    rows = gameStats(S);
  if (!rows.length) return sheetShell('Stats', '', '<p class="note">No matches yet.</p>');
  /* Late arrivals are left out of most and fewest. They only play from when they joined. */
  const base = rows.filter((r) => !r.late).length ? rows.filter((r) => !r.late) : rows;
  const max = Math.max(...base.map((r) => r.total)),
    min = Math.min(...base.map((r) => r.total)),
    even = max === min;
  const who = (v) => {
    const n = base.filter((r) => r.total === v).map((r) => r.name);
    return n.length > 3 ? n.length + ' players' : n.map(esc).join(', ');
  };
  const tiles = even
    ? '<div class="tiles one"><div class="tile"><span>Everyone has played</span><b>' +
      max +
      (max === 1 ? ' game' : ' games') +
      '</b></div></div>'
    : '<div class="tiles">' +
      '<div class="tile hi"><span>Most games</span><b>' +
      who(max) +
      '</b><small>' +
      max +
      ' games</small></div>' +
      '<div class="tile lo"><span>Fewest games</span><b>' +
      who(min) +
      '</b><small>' +
      min +
      ' games</small></div></div>';
  const top = Math.max(...rows.map((r) => r.total));
  const bars = rows
    .map((r) => {
      const cls = r.late || even ? '' : r.total === max ? ' most' : r.total === min ? ' least' : '';
      return (
        '<div class="sbar' +
        cls +
        (S.active.includes(r.name) ? '' : ' off') +
        '"><span class="nm">' +
        esc(r.name) +
        (r.late ? ' <small class="latetag">late</small>' : '') +
        '</span>' +
        '<span class="trk"><i class="t" style="width:' +
        (r.total / top) * 100 +
        '%"></i><i class="d" style="width:' +
        (r.done / top) * 100 +
        '%"></i></span>' +
        '<span class="num">' +
        r.done +
        '/' +
        r.total +
        '</span></div>'
      );
    })
    .join('');
  const lateNote = rows.some((r) => r.late)
    ? ' Late arrivals play from when they joined and are not counted as fewest.'
    : '';
  return sheetShell(
    'Stats',
    'Games per player',
    tiles +
      '<div class="sbars">' +
      bars +
      '</div><p class="note">The solid part is finished. The lighter part is on court now or up next.' +
      lateNote +
      '</p><button class="btn quiet" data-act="open-history">All-time results and backup</button>',
  );
}

/* ---------- actions ---------- */
/* Keeps the session in the saved results. Called before it is replaced or discarded. */
function archiveCurrent() {
  const rec = App.S && Archive.compactSession(App.S);
  if (!rec) return;
  App.history = Archive.upsert(App.history, rec);
  saveHistory();
}
function renameProblem(from, to) {
  if (!to) return 'Type a name first.';
  const low = to.toLowerCase();
  const names = App.roster.concat(App.S ? allNames(App.S) : []);
  if (names.some((n) => n !== from && n.toLowerCase() === low)) return to + ' is already on the list.';
  if (Archive.renameConflict(App.history, from, to))
    return from + ' and ' + to + ' have played in the same match, so they cannot share a name.';
  return null;
}
function renamePlayer(from, to) {
  const sw = (n) => (n === from ? to : n);
  App.roster = App.roster.map(sw);
  App.picked = new Set([...App.picked].map(sw));
  if (App.S) renameInSession(App.S, from, to);
  Archive.renameInRecords(App.history, from, to);
  App.undo = null; /* the saved undo copy still has the old name */
  save();
  saveHistory();
}
const dateStamp = () => new Date().toISOString().slice(0, 10);
async function exportBackup() {
  const data = Archive.buildExport(App.history, App.S, App.roster);
  if (!data.sessions.length) {
    showToast('No results to save yet.', false);
    return;
  }
  const text = JSON.stringify(data);
  const name = 'palong-palo-backup-' + dateStamp() + '.json';
  try {
    const file = new File([text], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Palong Palo backup' });
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return;
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  showToast('Backup saved to your downloads.', false);
}
/* One hidden file picker for the whole app. It is built once, so a closed sheet cannot lose it. */
const importInput = document.createElement('input');
importInput.type = 'file';
importInput.accept = 'application/json,.json';
importInput.setAttribute('aria-hidden', 'true');
importInput.tabIndex = -1;
importInput.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none';
document.body.appendChild(importInput);
importInput.addEventListener('change', async () => {
  const f = importInput.files && importInput.files[0];
  importInput.value = '';
  if (!f) return;
  let text;
  try {
    text = await f.text();
  } catch (e) {
    showToast('Could not read that file.', false);
    return;
  }
  const res = Archive.parseExport(text);
  if (res.error) {
    showToast(res.error, false);
    return;
  }
  const m = Archive.mergeSessions(App.history, res.sessions);
  App.history = m.list;
  res.roster.forEach((n) => {
    if (!App.roster.some((r) => r.toLowerCase() === n.toLowerCase())) {
      App.roster.push(n);
      App.picked.add(n);
    }
  });
  save();
  saveHistory();
  render();
  const bits = [];
  if (m.added) bits.push(m.added + (m.added === 1 ? ' session' : ' sessions') + ' added');
  if (m.updated) bits.push(m.updated + ' updated');
  if (m.skipped) bits.push(m.skipped + ' already here');
  if (res.skipped) bits.push(res.skipped + ' unreadable');
  showToast(bits.length ? 'Imported: ' + bits.join(', ') + '.' : 'Nothing to import.', false);
});

function onAction(act, el) {
  const d = el.dataset,
    S = App.S,
    sh = App.sheet;
  switch (act) {
    case 'pick': {
      const n = d.name;
      if (App.picked.has(n)) App.picked.delete(n);
      else App.picked.add(n);
      save();
      render();
      break;
    }
    case 'pick-all': {
      if (App.picked.size === App.roster.length) App.picked = new Set();
      else App.picked = new Set(App.roster);
      save();
      render();
      break;
    }
    case 'courts':
      App.cfg.courts = +d.v;
      save();
      render();
      break;
    case 'open-roster':
      openSheet({ type: 'roster' }, el);
      break;
    case 'roster-del': {
      const name = d.name;
      askConfirm({
        title: 'Remove ' + name + '?',
        body: 'They come off your players list. You can add them back any time.',
        label: 'Remove',
        act: 'roster-del',
        run: () => {
          App.roster = App.roster.filter((n) => n !== name);
          App.picked.delete(name);
          Sound.warn();
          save();
          render();
        },
      });
      break;
    }
    case 'stats':
      openSheet({ type: 'stats' }, el);
      break;
    case 'theme':
      switchTheme(d.v);
      break;
    case 'theme-cycle':
      switchTheme(Theme.pref === 'system' ? 'light' : Theme.pref === 'light' ? 'dark' : 'system');
      break;
    case 'sound':
      Sound.set(!Sound.enabled);
      render();
      break;
    case 'confirm-no':
      App.confirm = null;
      render();
      break;
    case 'confirm-yes': {
      const c = App.confirm;
      App.confirm = null;
      App.lastAct = c.act;
      c.run();
      break;
    }
    case 'generate': {
      if (App.busy || App.picked.size < 4) break;
      App.busy = true;
      render();
      setTimeout(() => {
        const names = App.roster.filter((n) => App.picked.has(n));
        archiveCurrent();
        App.S = newSession(App.cfg, names);
        App.view = 'schedule';
        App.anim = 'in';
        App.busy = false;
        hideToast(true);
        Sound.ok();
        save();
        render();
      }, 40);
      break;
    }
    case 'resume':
      App.view = 'schedule';
      App.anim = 'in';
      save();
      render();
      break;
    case 'setup':
      App.sheet = null;
      App.view = 'setup';
      App.anim = 'in';
      save();
      render();
      break;
    case 'menu':
      openSheet({ type: 'menu' }, el);
      break;
    case 'full':
      openSheet({ type: 'full' }, el);
      break;
    case 'players':
      openSheet({ type: 'players' }, el);
      break;
    case 'open-courts':
      openSheet({ type: 'courts' }, el);
      break;
    case 'player':
      openSheet({ type: 'change', name: d.name, mode: 'rest' }, el);
      break;
    case 'result':
      openSheet({ type: 'result', id: d.id }, el);
      break;
    case 'close':
      closeSheet();
      break;
    case 'mode':
      if (sh) {
        sh.mode = d.v;
        render();
      }
      break;
    case 'swap': {
      const name = sh.name,
        w = d.with;
      const msg = !locate(S, name)
        ? name + ' plays in place of ' + w + '.'
        : isFree(S, w)
          ? w + ' takes ' + name + '’s spot.'
          : name + ' and ' + w + ' swapped.';
      mutate(() => swapPlayers(S, name, w), msg);
      break;
    }
    case 'out':
      mutate(() => playerOut(S, sh.name, d.with || null), sh.name + ' is out for today.');
      break;
    case 'win': {
      const f = findMatch(S, sh.id);
      if (!f) break;
      const slot = f.c,
        changed = f.done;
      let made = [];
      mutate(
        () => {
          setResult(S, sh.id, d.side);
          if (!changed) made = fill(S);
        },
        () => {
          if (changed) return 'Winner changed.';
          if (made.length) {
            const nm = made.find((x) => x.c === slot) || made[0];
            return 'Winner saved. Court ' + courtLabel(S, nm.c) + ' next: ' + matchText(nm) + '.';
          }
          return (
            'Winner saved.' +
            (S.courts[slot - 1].open && !pendingOn(S, slot)
              ? ' Court ' + courtLabel(S, slot) + ' is waiting for players.'
              : '')
          );
        },
      );
      break;
    }
    case 'reopen':
      if (!canReopen(S, sh.id)) {
        showToast('This winner cannot be cleared now. The court has moved on.', false);
        break;
      }
      mutate(() => {
        reopen(S, sh.id);
        fill(S);
      }, 'Winner cleared.');
      break;
    case 'toggle-active': {
      const n = d.name;
      if (S.active.includes(n)) {
        const loc = locate(S, n);
        let rep = null;
        if (loc && !loc.m.started) {
          const per = summarize(S).per;
          rep =
            freePlayers(S)
              .filter((p) => p !== n)
              .sort((x, y) => per[x].played - per[y].played)[0] || null;
        }
        mutate(() => playerOut(S, n, rep), n + ' is out for today.', false);
      } else mutate(() => playerIn(S, n), n + ' is back in.', false);
      break;
    }
    case 'shuffle':
      if (S && S.matches.some((m) => !m.done && !m.started)) openSheet({ type: 'shuffle' }, el);
      break;
    case 'shuffle-do': {
      const mode = d.mode === 'partners' ? 'partners' : 'random';
      mutate(
        () => reroll(S, mode),
        mode === 'partners' ? 'Matches up next rebuilt for fresh partners.' : 'Matches up next shuffled.',
      );
      break;
    }
    case 'court-close': {
      const c = +d.c;
      mutate(() => setCourtOpen(S, c, false), 'Court ' + courtLabel(S, c) + ' closed. No new matches there.');
      break;
    }
    case 'court-open': {
      const c = +d.c;
      mutate(() => setCourtOpen(S, c, true), 'Court ' + courtLabel(S, c) + ' is open.');
      break;
    }
    case 'ask-new':
      askConfirm({
        title: 'Start a new session?',
        body: 'This clears the current schedule. Winners you logged stay in your saved results.',
        label: 'Start new session',
        act: 'new-session',
        run: () => {
          archiveCurrent();
          App.S = null;
          App.sheet = null;
          App.view = 'setup';
          App.anim = 'in';
          hideToast(true);
          Sound.warn();
          save();
          render();
        },
      });
      break;
    case 'start': {
      const m = S && findMatch(S, d.id);
      if (!m || m.done || m.started) break;
      App.undo = JSON.stringify(S);
      startMatch(S, d.id);
      Sound.ok();
      save();
      render();
      showToast('Court ' + courtLabel(S, m.c) + ' started.', true);
      break;
    }
    case 'rename-start':
      if (sh && sh.type === 'roster') {
        sh.editing = d.name;
        render();
      }
      break;
    case 'rename-cancel':
      if (sh) {
        sh.editing = null;
        render();
      }
      break;
    case 'open-history':
      openSheet({ type: 'history' }, el);
      break;
    case 'export':
      exportBackup();
      break;
    case 'import':
      importInput.click();
      break;
    case 'ask-clear-history':
      askConfirm({
        title: 'Clear saved results?',
        body: 'This removes every saved session from this phone. Save a backup first if you want to keep them. The session in progress is not affected.',
        label: 'Clear results',
        act: 'clear-history',
        run: () => {
          App.history = [];
          saveHistory();
          Sound.warn();
          render();
        },
      });
      break;
    case 'undo':
      if (App.undo) {
        App.S = JSON.parse(App.undo);
        App.undo = null;
        hideToast(true);
        Sound.undo();
        save();
        render();
      }
      break;
    default:
      break;
  }
}

$app.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  if (el.classList.contains('scrim') && e.target !== el) return;
  Sound.unlock();
  if (el.dataset.act !== 'sound') Sound.tap();
  App.lastAct = el.dataset.act;
  onAction(el.dataset.act, el);
});
/* Court numbers: digits only while typing, and each court needs its own number. */
$app.addEventListener('input', (e) => {
  if (/^(cn|sc)\d$/.test(e.target.id || '')) e.target.value = e.target.value.replace(/\D/g, '').slice(0, 2);
});
$app.addEventListener('change', (e) => {
  const m = /^cn(\d)$/.exec(e.target.id || '');
  if (!m) return;
  const i = +m[1],
    next = cleanLabel(e.target.value),
    other = App.cfg.courts > 1 ? App.cfg.labels[1 - i] : null;
  if (next && next !== other) {
    App.cfg.labels[i] = next;
    e.target.value = next;
    save();
    return;
  }
  showToast(next ? 'Each court needs its own number.' : 'Use a court number from 1 to 99.', false);
  render();
});
$app.addEventListener('submit', (e) => {
  e.preventDefault();
  if (e.target.id === 'f-roster') {
    const inp = document.getElementById('rname'),
      name = inp.value.trim();
    if (!name) return;
    if (!App.roster.some((n) => n.toLowerCase() === name.toLowerCase())) {
      App.roster.push(name);
      App.picked.add(name);
      save();
    }
    render();
    const again = document.getElementById('rname');
    if (again) again.focus();
  } else if (e.target.id === 'f-rename') {
    const from = e.target.dataset.from,
      to = document.getElementById('renameinp').value.trim().replace(/\s+/g, ' ');
    if (to === from) {
      App.sheet.editing = null;
      render();
      return;
    }
    const problem = renameProblem(from, to);
    if (problem) {
      showToast(problem, false);
      return;
    }
    renamePlayer(from, to);
    App.sheet.editing = null;
    render();
    showToast(from + ' is now ' + to + '.', false);
  } else if (e.target.id === 'f-courts') {
    const S = App.S;
    const vals = S.courts.map((_, i) => cleanLabel(document.getElementById('sc' + i).value));
    if (vals.some((v) => !v)) {
      showToast('Use a court number from 1 to 99.', false);
      return;
    }
    if (new Set(vals).size !== vals.length) {
      showToast('Each court needs its own number.', false);
      return;
    }
    S.courts.forEach((c, i) => (c.label = vals[i]));
    save();
    closeSheet();
    showToast('Court numbers saved.', false);
  } else if (e.target.id === 'f-late') {
    const inp = document.getElementById('latename'),
      name = inp.value.trim();
    if (!name) return;
    const S = App.S,
      known = allNames(S).find((n) => n.toLowerCase() === name.toLowerCase());
    const nm = known || name;
    if (S.active.includes(nm)) {
      showToast(nm + ' is already playing.', false);
      render();
      return;
    }
    if (!App.roster.some((n) => n.toLowerCase() === nm.toLowerCase())) App.roster.push(nm);
    mutate(() => playerIn(S, nm), nm + ' joins from the next round.', false);
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (App.confirm) {
    App.confirm = null;
    render();
  } else if (App.sheet) closeSheet();
});
load();
render();
