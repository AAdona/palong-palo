/* Light, dark or follow the phone. Runs first so the page never flashes the wrong colors. */
const Theme = (() => {
  const KEY = 'palong-palo.theme';
  const COLORS = { light: '#faf8f2', dark: '#141915' };
  const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  let pref = 'system';
  try {
    pref = localStorage.getItem(KEY) || 'system';
  } catch (e) {
    /* storage unavailable, follow the phone */
  }
  if (!['system', 'light', 'dark'].includes(pref)) pref = 'system';

  const resolved = () => (pref === 'system' ? (mq && mq.matches ? 'dark' : 'light') : pref);

  function apply() {
    const mode = resolved();
    document.documentElement.dataset.theme = mode;
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = COLORS[mode];
  }

  if (mq && mq.addEventListener) mq.addEventListener('change', () => pref === 'system' && apply());
  apply();

  return {
    get pref() {
      return pref;
    },
    get resolved() {
      return resolved();
    },
    set(value) {
      pref = ['system', 'light', 'dark'].includes(value) ? value : 'system';
      try {
        localStorage.setItem(KEY, pref);
      } catch (e) {
        /* ignore */
      }
      apply();
    },
  };
})();
