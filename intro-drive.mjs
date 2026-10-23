const clamp = value => Math.max(0, Math.min(1, value));
export const DRIVE_DURATION = 6800;
export const SPEED_QUOTE = "Speed has never killed anyone. Suddenly becoming stationary, that's what gets you";

// One continuous right-to-left pass, with a short cruising beat for reading.
export function drivePosition(progress, width, rigWidth) {
  const p = clamp(progress);
  const start = width + 30;
  const center = (width - rigWidth) / 2;
  const end = -rigWidth - 40;
  if (p < .42) return start + (center - start) * (1 - (1 - p / .42) ** 2);
  if (p < .62) return center - (p - .42) / .2 * 20;
  const t = (p - .62) / .38;
  return center - 20 + (end - center + 20) * t * t;
}

function initIntroDrive() {
  const intro = document.getElementById('scrollSequence');
  const stage = intro?.querySelector('.intro-stage');
  const video = intro?.querySelector('video');
  const main = document.getElementById('mainContent');
  const header = document.getElementById('siteHeader');
  if (!intro || !stage || !main || !header) return;

  const root = document.documentElement;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  main.querySelector('.hero-image')?.decode?.().catch(() => {});
  let state = 'intro', layer, rig, frame, deadline;
  let width = 0, rigWidth = 0, started = 0;
  let changedScrollRestoration = false;
  const originalScrollRestoration = history.scrollRestoration;
  if (performance.getEntriesByType('navigation')[0]?.type === 'reload') {
    history.scrollRestoration = 'manual';
    changedScrollRestoration = true;
    window.scrollTo({top: 0, left: 0, behavior: 'instant'});
  }
  const blockScroll = event => event.preventDefault();
  const blockKeys = event => {
    if (event.key === 'Escape') { finish(); return; }
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) event.preventDefault();
  };

  function unlinkIntro() {
    window.dispatchEvent(new Event('intro:consumed'));
    document.querySelectorAll('a[href="#scrollSequence"]').forEach(link => {
      link.setAttribute('href', '#mainContent');
      if (link.classList.contains('site-title')) link.setAttribute('aria-label', 'Larz Anderson — The project');
    });
    if (location.hash === '#scrollSequence') history.replaceState(null, '', location.pathname + location.search);
    root.classList.add('intro-consumed');
    intro.remove();
    window.removeEventListener('scroll', checkEnd);
    window.removeEventListener('resize', checkEnd);
    window.removeEventListener('pageshow', checkEnd);
  }

  function resize() {
    if (!layer) return;
    width = layer.clientWidth;
    rigWidth = rig.offsetWidth;
  }

  function finish() {
    if (state === 'done') return;
    const wasDriving = state === 'driving';
    state = 'done';
    cancelAnimationFrame(frame);
    clearTimeout(deadline);
    layer?.remove();
    if (intro.isConnected) unlinkIntro();
    root.classList.remove('intro-drive-running');
    document.body.style.removeProperty('--drive-scrollbar');
    window.removeEventListener('wheel', blockScroll);
    window.removeEventListener('touchmove', blockScroll);
    window.removeEventListener('keydown', blockKeys);
    window.removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', onVisibility);
    if (changedScrollRestoration) history.scrollRestoration = originalScrollRestoration;
    window.scrollTo({top: 0, left: 0, behavior: 'instant'});
    if (wasDriving && (document.activeElement === document.body || document.activeElement?.closest('.site-header'))) {
      main.tabIndex = -1;
      main.focus({preventScroll: true});
    }
  }

  function animate(now) {
    if (state !== 'driving') return;
    const p = clamp((now - started) / DRIVE_DURATION);
    const x = drivePosition(p, width, rigWidth);
    rig.style.transform = `translate3d(${x.toFixed(2)}px, -50%, 0)`;
    // The car leads; the quote follows in the newly revealed title page.
    const edge = Math.max(0, Math.min(width, x + 8));
    stage.style.clipPath = `inset(0 ${Math.max(0, width - edge).toFixed(2)}px 0 0)`;
    if (p >= 1) { finish(); return; }
    frame = requestAnimationFrame(animate);
  }

  function onVisibility() { if (document.hidden && state === 'driving') finish(); }

  function drive() {
    if (state !== 'intro') return;
    state = 'driving';
    if (motion.matches) { finish(); return; }
    layer = document.createElement('div');
    layer.className = 'intro-drive-layer';
    layer.setAttribute('aria-hidden', 'true');
    layer.inert = true;
    rig = document.createElement('div');
    rig.className = 'intro-drive-rig';
    const car = document.createElement('img');
    car.className = 'intro-drive-car';
    car.src = new URL('./assets/lexus-lfa-drive.png', import.meta.url).href;
    car.alt = '';
    car.width = 2172; car.height = 724;
    const rope = document.createElement('span');
    rope.className = 'intro-drive-rope';
    const quote = document.createElement('blockquote');
    quote.className = 'intro-drive-quote';
    quote.textContent = SPEED_QUOTE;
    rig.append(car, rope, quote);
    layer.append(stage, rig);
    document.body.append(layer);
    video?.pause();
    if (video && Number.isFinite(video.duration)) {
      try { video.currentTime = Math.max(0, video.duration - .035); } catch {}
    }
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual'; changedScrollRestoration = true;
    }
    const scrollbar = window.innerWidth - root.clientWidth;
    if (scrollbar > 0) document.body.style.setProperty('--drive-scrollbar', `${scrollbar}px`);
    root.classList.add('intro-drive-running');
    unlinkIntro();
    window.scrollTo({top: 0, left: 0, behavior: 'instant'});
    document.getElementById('loadingScreen')?.classList.add('is-hidden');
    window.addEventListener('wheel', blockScroll, {passive: false});
    window.addEventListener('touchmove', blockScroll, {passive: false});
    window.addEventListener('keydown', blockKeys);
    window.addEventListener('resize', resize, {passive: true});
    document.addEventListener('visibilitychange', onVisibility);
    resize();
    started = performance.now();
    animate(started);
    deadline = window.setTimeout(finish, DRIVE_DURATION + 1200);
    car.addEventListener('error', finish, {once: true});
  }

  function checkEnd() {
    if (state !== 'intro') return;
    // Browser anchor scrolling can happen before load; it is navigation to
    // content, not an instruction to play the end-of-intro transition.
    const destination = document.getElementById(location.hash.slice(1));
    if (destination && (destination === main || main.contains(destination))) {
      finish();
      destination.scrollIntoView({behavior: 'instant', block: 'start'});
      return;
    }
    const remaining = intro.getBoundingClientRect().bottom - stage.offsetHeight - header.offsetHeight;
    if (remaining <= 2) drive();
  }

  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const id = link.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if (state === 'done' || !target || !(target === main || main.contains(target))) return;
    event.preventDefault();
    finish();
    target.scrollIntoView({behavior: 'instant', block: 'start'});
    history.replaceState(null, '', `#${id}`);
  });
  motion.addEventListener('change', () => { if (motion.matches && state === 'driving') finish(); });
  window.addEventListener('scroll', checkEnd, {passive: true});
  window.addEventListener('resize', checkEnd, {passive: true});
  window.addEventListener('pageshow', checkEnd);
  window.addEventListener('load', () => {
    const target = document.getElementById(location.hash.slice(1));
    if (state === 'intro' && target && (target === main || main.contains(target))) {
      finish(); target.scrollIntoView({behavior: 'instant', block: 'start'});
    } else checkEnd();
  }, {once: true});
  checkEnd();
}

if (typeof document !== 'undefined') initIntroDrive();
