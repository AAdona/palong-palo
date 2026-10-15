/* ---------- app ---------- */
const KEY = 'monday-doubles.v1';
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
  'Angel',
];
const App = {
  view: 'setup',
  roster: DEFAULT_ROSTER.slice(),
  picked: new Set(DEFAULT_ROSTER),
  cfg: { courts: 2, minutes: 20, wins: [{ len: 180 }, { len: 180 }] },
  S: null,
  vr: 0,
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
const parseHM = (s) => {
  const [h, m] = String(s || '09:00')
    .split(':')
    .map(Number);
  return (h || 0) * 60 + (m || 0);
};
const fmtHM = (min) => {
  min = ((min % 1440) + 1440) % 1440;
  return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
};
const fmtLen = (min) => {
  const h = min / 60;
  if (Number.isInteger(h)) return h + 'h';
  return min % 30 === 0 ? h.toFixed(1) + 'h' : Math.floor(min / 60) + 'h ' + (min % 60) + 'm';
};
const LENS = [60, 90, 120, 150, 180, 210, 240, 270, 300, 360];
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
        vr: App.vr,
      }),
    );
  } catch (e) {
    /* storage unavailable */
  }
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (Array.isArray(d.roster) && d.roster.length) App.roster = d.roster.map(String);
    if (Array.isArray(d.picked)) App.picked = new Set(d.picked.filter((n) => App.roster.includes(n)));
    if (d.cfg && typeof d.cfg === 'object') {
      App.cfg = Object.assign(App.cfg, d.cfg);
      App.cfg.wins = [{ len: 180 }, { len: 180 }];
      delete App.cfg.start;
      delete App.cfg.hours;
      delete App.cfg.linked;
    }
    if (d.S && Array.isArray(d.S.rounds) && d.S.rounds.length && Array.isArray(d.S.active)) {
      App.S = d.S;
      App.view = d.view === 'schedule' ? 'schedule' : 'setup';
      App.vr = Math.min(Math.max(0, d.vr | 0), App.S.rounds.length - 1);
    }
  } catch (e) {
    /* ignore broken saves */
  }
}

/* ---------- views ---------- */
function courtBlock(i) {
  const w = App.cfg.wins[i],
    fr = framed(App.cfg.wins, App.cfg.courts)[i];
  const lenList = LENS.includes(w.len) ? LENS : LENS.concat([w.len]).sort((x, y) => x - y);
  const lens = lenList
    .map(
      (v) => '<option value="' + v + '"' + (v === w.len ? ' selected' : '') + '>' + fmtLen(v) + '</option>',
    )
    .join('');
  return (
    '<div class="cl1"><div class="cn"><span class="tl">Court ' +
    (i + 1) +
    '</span>' +
    (fr.start > 0 ? '<span class="endi">joins after ' + fmtLen(fr.start) + '</span>' : '') +
    '</div>' +
    '<select class="lsel" id="w' +
    i +
    'l" aria-label="Court ' +
    (i + 1) +
    ' length">' +
    lens +
    '</select></div>'
  );
}

function setupHTML() {
  const n = App.picked.size,
    { courts, minutes, wins } = App.cfg;
  const plan = planSlots(wins, courts, minutes);
  const use = Math.min(courts, Math.floor(n / 4));
  const ok = n >= 4 && plan.rounds > 0;
  let sum;
  if (plan.rounds < 1)
    sum = '<p class="summary warn" role="status">The session is shorter than one match.</p>';
  else if (n < 4) sum = '<p class="summary warn" role="status">Pick at least 4 players.</p>';
  else {
    const matches = plan.counts.reduce((t, c) => t + Math.min(c, Math.floor(n / 4)), 0);
    const per = Math.round((matches * 4) / n);
    sum =
      '<p class="summary' +
      (use < courts ? ' warn' : '') +
      '" role="status"><b>' +
      plan.rounds +
      ' rounds</b>, about <b>' +
      per +
      ' games</b> each.' +
      (use < courts
        ? ' Only ' + use + (use === 1 ? ' court' : ' courts') + ' can run at once with this many players.'
        : '') +
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
    '<button class="pchip add" data-act="open-roster" aria-label="Add or remove players">' +
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
    '<div class="field"><span class="lbl" id="l-courts">Courts</span><div class="seg" role="radiogroup" aria-labelledby="l-courts">' +
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
    '<div class="field"><span class="lbl" id="l-min">Minutes per match</span><div class="step"><button data-act="min" data-d="-5" aria-label="5 minutes less" aria-describedby="l-min">&minus;</button><output class="num" aria-live="polite">' +
    minutes +
    '<small>min</small></output><button data-act="min" data-d="5" aria-label="5 minutes more" aria-describedby="l-min">+</button></div></div>' +
    '<div class="field wide"><div class="lblrow"><span class="lbl">How long to play</span></div>' +
    courtBlock(0) +
    (courts > 1 ? courtBlock(1) : '') +
    '</div>' +
    '</div>' +
    sum +
    '</main>' +
    '<footer class="foot"><button class="btn primary" data-act="generate"' +
    (!ok || App.busy ? ' disabled' : '') +
    ' style="min-height:50px">' +
    (App.busy ? '<span class="spin"></span>Building schedule' : 'Generate schedule') +
    '</button></footer></div>'
  );
}

function matchText(m) {
  return m.a.join(' + ') + ' vs ' + m.b.join(' + ');
}

function matchCard(m, r, cur, idx, canClose) {
  let st;
  if (m.done) st = ['done', 'Done'];
  else if (r === cur || m.live) st = ['now', 'Playing now'];
  else if (r < cur) st = ['', 'Not logged'];
  else st = ['', r === cur + 1 ? 'Up next' : 'Later'];
  const pos = { a: ['26.4%', '73.6%'] };
  const pill = (name, side, k) => {
    const left = side === 'a' ? '26.4%' : '73.6%',
      top = k === 0 ? '27.9%' : '72.1%';
    const won = m.done && m.winner === side,
      lost = m.done && m.winner && m.winner !== side;
    return (
      '<button class="pill t-' +
      side +
      (lost ? ' lose' : '') +
      '" style="left:' +
      left +
      ';top:' +
      top +
      '" data-act="player" data-name="' +
      esc(name) +
      '" data-r="' +
      r +
      '"' +
      (m.done ? ' disabled' : '') +
      ' aria-label="' +
      esc(name) +
      ', team ' +
      side.toUpperCase() +
      (won ? ', winner' : '') +
      (m.done ? '' : '. Change player') +
      '">' +
      (won ? I.check : '') +
      '<span>' +
      esc(name) +
      '</span></button>'
    );
  };
  return (
    '<article class="match" aria-label="Court ' +
    m.court +
    '">' +
    '<header class="match-h"><div class="match-t"><span class="court-n">Court ' +
    m.court +
    '</span><span class="badge ' +
    st[0] +
    '">' +
    (m.done ? I.check : I.dot) +
    st[1] +
    '</span></div>' +
    '<div class="mh-a">' +
    (canClose
      ? '<button class="btn quiet icon sm" data-act="court-close" data-c="' +
        m.court +
        '" data-r="' +
        r +
        '" aria-label="Skip court ' +
        m.court +
        ' this round" title="Skip court ' +
        m.court +
        ' this round">' +
        I.court +
        '</button>'
      : '') +
    '<button class="btn sm" data-act="result" data-id="' +
    m.id +
    '">' +
    (m.done ? 'Change winner' : 'Pick winner') +
    '</button></div></header>' +
    '<div class="court-slot"><div class="court">' +
    COURT_SVG +
    pill(m.a[0], 'a', 0) +
    pill(m.a[1], 'a', 1) +
    pill(m.b[0], 'b', 0) +
    pill(m.b[1], 'b', 1) +
    '</div></div></article>'
  );
}

function scheduleHTML() {
  const S = App.S;
  App.vr = Math.min(Math.max(0, App.vr), S.rounds.length - 1);
  const r = App.vr,
    rd = S.rounds[r],
    cur = curRound(S),
    total = S.rounds.length;
  const t0 = startMinOf(S) + r * S.minutes;
  const segs = S.rounds
    .map((x, i) => {
      const done = x.matches.length > 0 && x.matches.every((m) => m.done);
      return (
        '<button data-act="goto" data-r="' +
        i +
        '" class="' +
        [done ? 'done' : '', i === cur ? 'cur' : '', i === r ? 'view' : ''].join(' ') +
        '" aria-label="Round ' +
        (i + 1) +
        (done ? ', done' : '') +
        (i === cur ? ', current' : '') +
        '"' +
        (i === r ? ' aria-current="true"' : '') +
        '><i></i></button>'
      );
    })
    .join('');
  const pending = rd.matches.some((m) => !m.done);
  const one = rd.matches.length <= 1;
  let courts;
  if (!rd.matches.length) {
    courts =
      '<div class="empty"><b>No match this round</b><span>Four players are needed. Add someone from Players.</span></div>';
  } else {
    courts =
      '<div class="courts' +
      (one ? ' one' : '') +
      '">' +
      rd.matches.map((m, i) => matchCard(m, r, cur, i, rd.matches.length > 1 && !m.done)).join('') +
      '</div>';
  }
  const avail = courtsFor(S, r),
    closed = [];
  for (let c = 1; c <= Math.max(S.courts, 2); c++) {
    if (avail.includes(c)) continue;
    let first = -1;
    for (let q = r + 1; q < S.rounds.length; q++)
      if (courtsFor(S, q).includes(c)) {
        first = q;
        break;
      }
    const off = isOffAt(S, c, r);
    closed.push(
      '<span>Court ' +
        c +
        (off ? ' is off this round' : first >= 0 ? ' starts in round ' + (first + 1) : ' is closed') +
        '</span>' +
        (off
          ? '<button class="btn sm quiet" data-act="court-on-round" data-c="' +
            c +
            '" data-r="' +
            r +
            '">' +
            I.plus.replace('<svg', '<svg style="width:14px;height:14px"') +
            'Open</button>'
          : r === cur
            ? '<button class="btn sm quiet" data-act="court-open" data-c="' +
              c +
              '">' +
              I.plus.replace('<svg', '<svg style="width:14px;height:14px"') +
              (first >= 0 ? 'Open now' : 'Open') +
              '</button>'
            : ''),
    );
  }
  S.rounds.forEach((x, q) => {
    if (q <= r) return;
    x.matches.forEach((m) => {
      if (m.live && !m.done)
        closed.push(
          '<span>Court ' +
            m.court +
            ' is playing: ' +
            esc(matchText(m)) +
            '</span>' +
            '<button class="btn sm quiet" data-act="goto" data-r="' +
            q +
            '">Show</button>',
        );
    });
  });
  const cnote = closed.length
    ? '<div class="note courtnote">' +
      closed.map((x) => '<div class="cnrow">' + x + '</div>').join('') +
      '</div>'
    : '';
  const rest =
    '<section class="rest" aria-label="Resting this round">' +
    (rd.rest.length
      ? '<span class="rest-l">Resting</span>' +
        rd.rest
          .map(
            (p) =>
              '<button class="rchip" data-act="player" data-name="' +
              esc(p) +
              '" data-r="' +
              r +
              '"' +
              (pending ? '' : ' disabled') +
              '>' +
              esc(p) +
              '</button>',
          )
          .join('')
      : '<span class="note">Everyone is playing this round.</span>') +
    '</section>';
  let up = '';
  if (rd.matches.length) {
    const rows = S.rounds
      .slice(r + 1, r + 7)
      .map(
        (x, i) =>
          '<button class="urow" data-act="goto" data-r="' +
          (r + 1 + i) +
          '"><b>Round ' +
          (r + 2 + i) +
          '</b><span>' +
          (x.matches.length ? x.matches.map(matchText).join('. ') : 'No match') +
          '</span></button>',
      )
      .join('');
    up =
      '<section class="upnext" aria-label="Coming up"><h3>Coming up</h3>' +
      (rows || '<p class="note">This is the last round. Add another from the menu.</p>') +
      '</section>';
  }
  return (
    '<div class="shell">' +
    '<header class="top sched"><div class="brand">' +
    I.brand +
    '<span>Palong Palo</span></div><div class="actions">' +
    '<button class="btn quiet icon" data-act="full" aria-label="Full schedule" title="Full schedule">' +
    I.list +
    '</button>' +
    '<button class="btn quiet icon" data-act="stats" aria-label="Stats" title="Stats">' +
    I.stats +
    '</button>' +
    '<button class="btn quiet icon" data-act="add-round" aria-label="Add a round" title="Add a round">' +
    I.roundplus +
    '</button>' +
    '<button class="btn quiet icon" data-act="shuffle" aria-label="Reshuffle remaining rounds" title="Reshuffle remaining rounds">' +
    I.shuffle +
    '</button>' +
    '<button class="btn quiet icon" data-act="menu" aria-label="More" title="More">' +
    I.menu +
    '</button></div></header>' +
    '<main class="main">' +
    '<div class="roundbar"><div class="roundrow"><h1 class="roundtitle">Round ' +
    (r + 1) +
    '<small>of ' +
    total +
    '</small></h1><div class="rt"><span class="roundtime">' +
    S.minutes +
    ' min a match</span><button class="btn quiet icon sm" data-act="del-round" data-r="' +
    r +
    '" aria-label="Delete round ' +
    (r + 1) +
    '" title="Delete this round"' +
    (total < 2 ? ' disabled' : '') +
    '>' +
    I.trash +
    '</button></div></div>' +
    '<div class="segs">' +
    segs +
    '</div></div>' +
    courts +
    cnote +
    rest +
    up +
    '</main>' +
    '<footer class="foot"><div class="footnav">' +
    '<button class="btn" data-act="prev"' +
    (r === 0 ? ' disabled' : '') +
    '>' +
    I.prev +
    'Prev</button>' +
    '<button class="btn" data-act="players">' +
    I.people +
    'Players</button>' +
    '<button class="btn primary" data-act="next"' +
    (r >= total - 1 ? ' disabled' : '') +
    '>Next round' +
    I.next +
    '</button></div></footer></div>'
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
    round = S.rounds[sh.r],
    loc = round && findPlayer(round, sh.name);
  if (!loc) return '';
  const per = summarize(S).per;
  const pl = (p) => (per[p] ? per[p].played : 0);
  const pend = round.matches.filter((m) => !m.done);
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
  if (loc.rest) {
    const list = pend
      .flatMap((m) =>
        [...m.a, ...m.b].map((p) => cand(p, 'Court ' + m.court + ', ' + pl(p) + ' played', '', 'swap')),
      )
      .join('');
    return sheetShell(
      'Bring in ' + sh.name,
      'Round ' + (sh.r + 1) + ', ' + pl(sh.name) + ' played',
      '<div class="group"><h3>Who sits out instead?</h3><div class="cands">' + list + '</div></div>',
    );
  }
  const m = loc.m;
  const out = sh.mode === 'out';
  const rel = (p) =>
    m.a.includes(p) === m.a.includes(sh.name) &&
    [...m.a, ...m.b].includes(p) &&
    m === loc.m &&
    (m.a.includes(p) ? m.a : m.b).includes(sh.name)
      ? 'Partner'
      : null;
  let body =
    '<div class="seg mode" role="radiogroup" aria-label="How long">' +
    '<button role="radio" aria-checked="' +
    !out +
    '" data-act="mode" data-v="rest">Rest this round</button>' +
    '<button role="radio" aria-checked="' +
    out +
    '" data-act="mode" data-v="out">Out for today</button></div>';
  if (round.rest.length) {
    body +=
      '<div class="group"><h3>' +
      (out ? 'Who takes ' + esc(sh.name) + '’s spot?' : 'Replace with someone resting') +
      '</h3><div class="cands">' +
      round.rest.map((p) => cand(p, pl(p) + ' played', 'free', out ? 'out' : 'swap')).join('') +
      '</div></div>';
  } else {
    body +=
      '<div class="group"><p class="note">Nobody is resting this round, so there is no one to step in. The other three will sit out this match.</p>' +
      '<button class="btn" data-act="' +
      (out ? 'out' : 'skip') +
      '" data-with="">' +
      (out ? 'Out for today, skip this match' : 'Rest and skip this match') +
      '</button></div>';
  }
  if (!out) {
    const others = [];
    pend.forEach((mm) =>
      [...mm.a, ...mm.b].forEach((p) => {
        if (p === sh.name) return;
        let sub = 'Court ' + mm.court;
        if (mm === m) sub = m.a.includes(p) === m.a.includes(sh.name) ? 'Partner' : 'Opponent';
        others.push(cand(p, sub, '', 'swap'));
      }),
    );
    if (others.length)
      body +=
        '<div class="group"><h3>Swap with someone playing</h3><div class="cands">' +
        others.join('') +
        '</div></div>';
  }
  return sheetShell(
    sh.name,
    'Round ' + (sh.r + 1) + ', Court ' + m.court + ', ' + pl(sh.name) + ' played',
    body,
  );
}

function resultSheet(sh) {
  const f = findMatch(App.S, sh.id);
  if (!f) return '';
  const m = f.m;
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
  const body =
    '<div class="group"><h3>Tap the winning team</h3>' +
    wb('a') +
    wb('b') +
    '</div>' +
    (m.done ? '<button class="btn quiet danger" data-act="reopen">Clear winner</button>' : '');
  return sheetShell('Court ' + m.court + ', Round ' + (f.r + 1), 'Best of 3 to 15', body);
}

function overall(S) {
  const per = summarize(S).per;
  const rows = Object.values(per)
    .filter((p) => p.w + p.l > 0)
    .sort((x, y) => y.w - x.w || x.l - y.l || x.name.localeCompare(y.name));
  return rows;
}

function fullSheet() {
  const S = App.S,
    cur = curRound(S),
    rows = overall(S);
  const allDone = S.rounds.every((rd) => rd.matches.every((m) => m.done));
  let rank;
  if (!rows.length)
    rank =
      '<p class="note">No winners logged yet. Pick a winner on each match and the overall ranking shows up here.</p>';
  else {
    const top = rows.filter((p) => p.w === rows[0].w && p.l === rows[0].l);
    let place = 0,
      prev = null;
    rank =
      '<p class="lead">' +
      (allDone ? 'Overall winner' : 'Leading') +
      ': <b>' +
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
      '<div class="rank" role="table" aria-label="Overall ranking">' +
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
  const rounds = S.rounds
    .map((rd, r) => {
      const done = rd.matches.length > 0 && rd.matches.every((m) => m.done);
      const team = (m, side) => {
        const names = (side === 'a' ? m.a : m.b).join(' + ');
        const won = m.done && m.winner === side;
        return (
          '<span class="tm' +
          (m.done ? (won ? ' w' : ' l') : '') +
          '">' +
          (won ? I.check : '') +
          esc(names) +
          '</span>'
        );
      };
      const ms =
        rd.matches
          .map(
            (m) =>
              '<div class="fm"><span class="ct">C' +
              m.court +
              '</span><span class="mt">' +
              team(m, 'a') +
              '<i class="vs">vs</i>' +
              team(m, 'b') +
              '</span></div>',
          )
          .join('') || '<p class="rs">No match</p>';
      return (
        '<section class="rd' +
        (r === cur ? ' cur' : '') +
        '"><button class="rd-h" data-act="jump" data-r="' +
        r +
        '" aria-label="Go to round ' +
        (r + 1) +
        '"><b>R' +
        (r + 1) +
        '</b><small>' +
        (done ? 'Done' : r === cur ? 'Now' : '') +
        '</small></button>' +
        '<div class="rb">' +
        ms +
        (rd.rest.length ? '<p class="rs">Rest: ' + rd.rest.map(esc).join(', ') + '</p>' : '') +
        '</div></section>'
      );
    })
    .join('');
  return sheetShell(
    'Full schedule',
    S.rounds.length + ' rounds, ' + S.active.length + ' players',
    '<div class="group"><h3>Overall</h3>' +
      rank +
      '</div><div class="group"><h3>Rounds</h3><div class="rlist">' +
      rounds +
      '</div></div>',
    'tall',
  );
}

function playersSheet() {
  const S = App.S,
    sm = summarize(S),
    cur = curRound(S);
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
    '<p class="note">Switching someone Out takes them off the rest of the schedule. A late player joins from the next round.</p>';
  return sheetShell('Players', 'Round ' + (cur + 1) + ' of ' + S.rounds.length, body);
}

function menuSheet() {
  const S = App.S,
    sm = summarize(S);
  const body =
    '<div class="group"><h3>Theme</h3><div class="seg three" role="radiogroup" aria-label="Theme">' +
    [
      ['system', 'Auto'],
      ['light', 'Light'],
      ['dark', 'Dark'],
    ]
      .map(
        ([v, l]) =>
          '<button role="radio" aria-checked="' +
          (Theme.pref === v) +
          '" data-act="theme" data-v="' +
          v +
          '">' +
          l +
          '</button>',
      )
      .join('') +
    '</div></div>' +
    '<div class="group"><h3>Play longer</h3><div class="cands">' +
    '<button class="btn" data-act="add-round">' +
    I.plus +
    'Add 1 round</button>' +
    '<button class="btn" data-act="add-hour">' +
    I.plus +
    'Add 1 hour</button></div></div>' +
    '<div class="group"><div class="rrow"><span>Sound<small class="cs">Tap sounds and small buzzes</small></span>' +
    '<button class="sw" role="switch" aria-checked="' +
    Sound.enabled +
    '" aria-label="Sound" data-act="sound">' +
    (Sound.enabled ? 'On' : 'Off') +
    '</button></div></div>' +
    '<div class="menu"><button class="btn" data-act="setup">Back to setup</button>' +
    '<button class="btn danger" data-act="ask-new">Start a new session</button></div>' +
    '<p class="note">Each match is about ' +
    S.minutes +
    ' minutes. Opponent coverage is ' +
    sm.oppPct +
    '% and partner coverage is ' +
    sm.partnerPct +
    '%.</p>';
  return sheetShell('Session', S.active.length + ' players', body);
}

function rosterSheet() {
  const rows = App.roster
    .map(
      (n) =>
        '<div class="rrow"><span>' +
        esc(n) +
        '</span><button class="btn sm quiet danger" data-act="roster-del" data-name="' +
        esc(n) +
        '" aria-label="Remove ' +
        esc(n) +
        '">Remove</button></div>',
    )
    .join('');
  return sheetShell(
    'Players list',
    'Add a guest or remove someone',
    '<form id="f-roster" class="addrow"><input id="rname" type="text" placeholder="Name" autocomplete="off" aria-label="New player name" maxlength="20"><button class="btn primary" type="submit">Add</button></form><div>' +
      rows +
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
  if (sh.type === 'roster') return rosterSheet();
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
  'add-round': 'ok',
  'add-hour': 'ok',
  'court-on-round': 'ok',
  'court-open': 'ok',
  'court-close': 'warn',
  'del-round': 'warn',
  skip: 'warn',
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
  showLoading('Updating schedule');
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

/* Games per player: scheduled total and how many are already logged as done. */
function gameStats(S) {
  const per = {};
  allNames(S).forEach(
    (n) => (per[n] = { name: n, total: 0, done: 0, late: ((S.baseline || {})[n] || 0) > 0 }),
  );
  S.rounds.forEach((rd) =>
    rd.matches.forEach((m) =>
      m.a.concat(m.b).forEach((p) => {
        per[p].total++;
        if (m.done) per[p].done++;
      }),
    ),
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
    ? '<div class="tiles one"><div class="tile"><span>Everyone plays</span><b>' +
      max +
      ' games</b></div></div>'
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
      '</div><p class="note">The solid part is played and logged. The rest is still to come.' +
      lateNote +
      '</p>',
  );
}

/* ---------- actions ---------- */
function goRound(r, dir) {
  if (!App.S) return;
  const n = Math.min(Math.max(0, r), App.S.rounds.length - 1);
  if (n === App.vr) return;
  App.vr = n;
  App.anim = dir || 'go';
  save();
  render();
}
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
    case 'min':
      App.cfg.minutes = Math.min(40, Math.max(10, App.cfg.minutes + +d.d));
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
      if (
        App.busy ||
        App.picked.size < 4 ||
        planSlots(App.cfg.wins, App.cfg.courts, App.cfg.minutes).rounds < 1
      )
        break;
      App.busy = true;
      render();
      setTimeout(() => {
        const names = App.roster.filter((n) => App.picked.has(n));
        App.S = newSession(App.cfg, names);
        App.view = 'schedule';
        App.vr = 0;
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
    case 'prev':
      goRound(App.vr - 1, 'prev');
      break;
    case 'next':
      goRound(App.vr + 1, 'next');
      break;
    case 'goto':
      goRound(+d.r, 'go');
      break;
    case 'menu':
      openSheet({ type: 'menu' }, el);
      break;
    case 'full':
      openSheet({ type: 'full' }, el);
      break;
    case 'jump':
      App.sheet = null;
      App.sheetNew = false;
      App.vr = +d.r;
      App.anim = 'go';
      save();
      render();
      break;
    case 'players':
      openSheet({ type: 'players' }, el);
      break;
    case 'player':
      openSheet({ type: 'change', r: +d.r, name: d.name, mode: 'rest' }, el);
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
        w = d.with,
        round = S.rounds[sh.r],
        loc = findPlayer(round, name);
      const msg =
        loc && loc.rest
          ? name + ' plays in place of ' + w + '. Later rounds updated.'
          : round.rest.includes(w)
            ? w + ' takes ' + name + '’s spot. Later rounds updated.'
            : name + ' and ' + w + ' swapped. Later rounds updated.';
      mutate(() => swapPlayers(S, sh.r, name, w), msg);
      break;
    }
    case 'skip':
      mutate(() => {
        dropMatchFor(S, sh.r, sh.name, false);
        buildFrom(S, sh.r + 1, 150);
      }, sh.name + ' rests and the match is skipped. Later rounds updated.');
      break;
    case 'out':
      mutate(
        () => playerOut(S, sh.name, sh.r, d.with || null),
        sh.name + ' is out for today. Later rounds updated.',
      );
      break;
    case 'win': {
      const f = findMatch(S, sh.id);
      let started = null;
      mutate(
        () => {
          setResult(S, sh.id, d.side, []);
          const rd = S.rounds[f.r];
          if (rd.matches.every((m) => m.done)) {
            if (f.r === App.vr && f.r < S.rounds.length - 1) {
              App.vr = curRound(S);
              App.anim = 'next';
            }
          } else started = startEarly(S, f.r, f.m.court);
        },
        () =>
          started
            ? 'Winner saved. Court ' + f.m.court + ' next: ' + matchText(started) + '.'
            : 'Winner saved.',
      );
      break;
    }
    case 'reopen':
      mutate(() => reopen(S, sh.id), 'Winner cleared.');
      break;
    case 'toggle-active': {
      const n = d.name,
        cur = curRound(S);
      if (S.active.includes(n)) {
        const round = S.rounds[cur];
        let rep = null;
        if (round && round.rest.length) {
          const per = summarize(S).per;
          rep = round.rest.slice().sort((x, y) => per[x].played - per[y].played)[0];
        }
        mutate(() => playerOut(S, n, cur, rep), n + ' is out for today. Later rounds updated.', false);
      } else mutate(() => playerIn(S, n), n + ' is back in from the next round.', false);
      break;
    }
    case 'shuffle':
      mutate(() => buildFrom(S, curRound(S), 300), 'Remaining rounds reshuffled.');
      break;
    case 'add-hour': {
      let n = 0;
      mutate(
        () => {
          n = extendBy(S, 60);
        },
        () => '1 hour added, ' + n + ' more rounds.',
      );
      break;
    }
    case 'add-round':
      mutate(() => {
        extendBy(S, S.minutes);
      }, 'Round added.');
      break;
    case 'court-close': {
      const c = +d.c,
        r = +d.r;
      mutate(() => setCourtAt(S, c, r, false), 'Court ' + c + ' skipped for round ' + (r + 1) + '.');
      break;
    }
    case 'court-on-round': {
      const c = +d.c,
        r = +d.r;
      mutate(() => setCourtAt(S, c, r, true), 'Court ' + c + ' is back for round ' + (r + 1) + '.');
      break;
    }
    case 'del-round': {
      const r = +d.r;
      askConfirm({
        title: 'Delete round ' + (r + 1) + '?',
        body: 'Its matches are removed and the later rounds move up. You can undo right after.',
        label: 'Delete round',
        act: 'del-round',
        run: () =>
          mutate(
            () => {
              deleteRound(S, r);
              App.vr = Math.min(r, S.rounds.length - 1);
            },
            'Round ' + (r + 1) + ' deleted.',
          ),
      });
      break;
    }
    case 'court-open': {
      const c = +d.c,
        turnOn = act === 'court-open';
      mutate(
        () => setCourt(S, c, turnOn),
        'Court ' + c + (turnOn ? ' opened from this round.' : ' closed from this round.'),
      );
      break;
    }
    case 'ask-new':
      askConfirm({
        title: 'Start a new session?',
        body: 'This discards the current schedule and all results.',
        label: 'Discard session',
        act: 'new-session',
        run: () => {
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
    case 'undo':
      if (App.undo) {
        App.S = JSON.parse(App.undo);
        App.undo = null;
        hideToast(true);
        Sound.undo();
        App.vr = Math.min(App.vr, App.S.rounds.length - 1);
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
$app.addEventListener('change', (e) => {
  const m = /^w(\d)l$/.exec(e.target.id || '');
  if (m) {
    App.cfg.wins[+m[1]].len = +e.target.value;
    save();
    render();
  }
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
let tx = 0,
  ty = 0;
$app.addEventListener(
  'touchstart',
  (e) => {
    tx = e.touches[0].clientX;
    ty = e.touches[0].clientY;
  },
  { passive: true },
);
$app.addEventListener(
  'touchend',
  (e) => {
    if (App.view !== 'schedule' || App.sheet || !App.S) return;
    const dx = e.changedTouches[0].clientX - tx,
      dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 70 && Math.abs(dy) < 40 && !e.target.closest('.upnext'))
      goRound(App.vr + (dx < 0 ? 1 : -1), dx < 0 ? 'next' : 'prev');
  },
  { passive: true },
);

load();
render();
