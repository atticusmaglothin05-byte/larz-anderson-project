// A single crossfade retires the aerial and leaves the reader at the title.
export const HANDOFF_DURATION = 650;

function initIntroHandoff() {
  const intro = document.getElementById('scrollSequence');
  const stage = intro?.querySelector('.intro-stage');
  const main = document.getElementById('mainContent');
  const header = document.getElementById('siteHeader');
  if (!intro || !stage || !main || !header) return;
  const root = document.documentElement;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const heroImage = main.querySelector('.hero-image');
  let state = 'intro', layer, deadline, readyDeadline, safetyDeadline;
  const originalRestoration = history.scrollRestoration;
  if (performance.getEntriesByType('navigation')[0]?.type === 'reload' && !location.hash) {
    history.scrollRestoration = 'manual';
    window.scrollTo({top: 0, behavior: 'instant'});
  }
  heroImage?.decode?.().catch(() => {});
  const blockScroll = event => event.preventDefault();
  const blockKeys = event => {
    if (event.key === 'Escape') { finish(); return; }
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) event.preventDefault();
  };

  function retireIntro() {
    window.dispatchEvent(new Event('intro:consumed'));
    root.classList.add('intro-consumed');
    intro.remove();
    document.querySelectorAll('a[href="#scrollSequence"]').forEach(link => {
      link.setAttribute('href', '#mainContent');
      if (link.classList.contains('site-title')) link.setAttribute('aria-label', 'Larz Anderson — The project');
    });
    if (location.hash === '#scrollSequence') history.replaceState(null, '', location.pathname + location.search);
    window.removeEventListener('scroll', checkEnd);
    window.removeEventListener('resize', checkEnd);
    window.removeEventListener('pageshow', checkEnd);
  }

  function finish() {
    if (state === 'done') return;
    const wasFading = state === 'fading';
    state = 'done';
    clearTimeout(deadline); clearTimeout(readyDeadline); clearTimeout(safetyDeadline);
    if (intro.isConnected) retireIntro();
    layer?.remove();
    root.classList.remove('intro-handoff-running');
    document.body.style.removeProperty('--handoff-scrollbar');
    window.removeEventListener('wheel', blockScroll);
    window.removeEventListener('touchmove', blockScroll);
    window.removeEventListener('keydown', blockKeys);
    document.removeEventListener('visibilitychange', onVisibility);
    history.scrollRestoration = originalRestoration;
    window.scrollTo({top: 0, behavior: 'instant'});
    if (wasFading && (document.activeElement === document.body || document.activeElement?.closest('.site-header'))) {
      main.tabIndex = -1;
      main.focus({preventScroll: true});
    }
  }

  function onVisibility() { if (document.hidden && state === 'fading') finish(); }

  function handoff() {
    if (state !== 'intro') return;
    state = 'fading';
    if (motion.matches) { finish(); return; }
    // Snapshot the rendered frame before retiring the video. Reparenting a
    // video can reset its composited surface, especially in WebKit.
    layer = document.createElement('div');
    layer.className = 'intro-handoff-layer';
    layer.setAttribute('aria-hidden', 'true');
    layer.inert = true;
    const video = stage.querySelector('video');
    const poster = document.createElement('img');
    poster.className = 'intro-freeze';
    poster.alt = '';
    poster.src = video?.poster || 'assets/larz-poster.jpg';
    layer.append(poster);
    if (video?.readyState >= 2 && video.videoWidth && video.videoHeight) {
      const snapshot = document.createElement('canvas');
      snapshot.className = 'intro-freeze';
      snapshot.width = video.videoWidth;
      snapshot.height = video.videoHeight;
      const context = snapshot.getContext('2d');
      if (context) {
        try { context.drawImage(video, 0, 0); layer.append(snapshot); } catch {}
      }
    }
    document.body.append(layer);
    video?.pause();
    const scrollbar = innerWidth - root.clientWidth;
    document.body.style.setProperty('--handoff-scrollbar', scrollbar + 'px');
    history.scrollRestoration = 'manual';
    root.classList.add('intro-handoff-running');
    retireIntro();
    window.scrollTo({top: 0, behavior: 'instant'});
    document.getElementById('loadingScreen')?.classList.add('is-hidden');
    window.addEventListener('wheel', blockScroll, {passive: false});
    window.addEventListener('touchmove', blockScroll, {passive: false});
    window.addEventListener('keydown', blockKeys);
    document.addEventListener('visibilitychange', onVisibility);
    let started = false;
    function fade() {
      if (started || state !== 'fading') return;
      started = true;
      clearTimeout(readyDeadline);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (state !== 'fading') return;
        layer.classList.add('is-leaving');
        deadline = setTimeout(finish, HANDOFF_DURATION + 80);
      }));
    }
    if (!heroImage || (heroImage.complete && heroImage.naturalWidth)) fade();
    else {
      heroImage.addEventListener('load', fade, {once: true});
      heroImage.addEventListener('error', fade, {once: true});
      readyDeadline = setTimeout(fade, 1400);
    }
    safetyDeadline = setTimeout(finish, 2600);
  }

  function checkEnd() {
    if (state !== 'intro') return;
    const target = document.getElementById(location.hash.slice(1));
    if (target && (target === main || main.contains(target))) {
      finish(); target.scrollIntoView({behavior: 'instant', block: 'start'}); return;
    }
    if (motion.matches) return;
    const remaining = intro.getBoundingClientRect().bottom - stage.offsetHeight - header.offsetHeight;
    if (remaining <= 2) handoff();
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
    history.replaceState(null, '', '#' + id);
  });
  motion.addEventListener('change', () => { if (motion.matches && state === 'fading') finish(); });
  window.addEventListener('scroll', checkEnd, {passive: true});
  window.addEventListener('resize', checkEnd, {passive: true});
  window.addEventListener('pageshow', checkEnd);
  window.addEventListener('load', checkEnd, {once: true});
  checkEnd();
}

if (typeof document !== 'undefined') initIntroHandoff();
