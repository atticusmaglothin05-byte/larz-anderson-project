const clamp = value => Math.max(0, Math.min(1, value));

// The same moving edge defines both the hole and its glowing fire perimeter.
export function burnOutline(progress, width, height, time = 0) {
  const p = clamp(progress);
  const radius = Math.hypot(width * .52, height * .54) * 1.22 * p;
  return Array.from({length: 160}, (_, i) => {
    const angle = i / 160 * Math.PI * 2;
    const noise = Math.sin(angle * 9 + .8) * .035
      + Math.sin(angle * 17 - time * 2) * .022
      + Math.sin(angle * 31 + time * 3) * .012;
    const r = radius * (1 + noise);
    return [width * .48 + Math.cos(angle) * r, height * .46 + Math.sin(angle) * r];
  });
}

export function burnClip(points, width, height) {
  const hole = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return `path(evenodd, "M0 0 H${width} V${height} H0 Z ${hole} Z")`;
}

function initIntroBurn() {
  const intro = document.getElementById('scrollSequence');
  const stage = intro?.querySelector('.intro-stage');
  const video = intro?.querySelector('video');
  const main = document.getElementById('mainContent');
  const header = document.getElementById('siteHeader');
  if (!intro || !stage || !main || !header) return;

  const root = document.documentElement;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const heroImage = main.querySelector('.hero-image');
  if (heroImage) { heroImage.loading = 'eager'; heroImage.decode?.().catch(() => {}); }
  let state = 'intro';
  let layer, canvas, context, frame, deadline;
  let width = 0, height = 0;
  let started = 0;
  let sparks = [];
  let previousTime = 0;
  let changedScrollRestoration = false;
  const originalScrollRestoration = history.scrollRestoration;
  const blockScroll = event => event.preventDefault();
  const blockKeys = event => {
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
  }

  function resize() {
    if (!layer) return;
    width = layer.clientWidth;
    height = layer.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function finish() {
    if (state === 'done') return;
    state = 'done';
    cancelAnimationFrame(frame);
    clearTimeout(deadline);
    layer?.remove();
    if (intro.isConnected) unlinkIntro();
    root.classList.remove('intro-burn-running');
    document.body.style.removeProperty('--burn-scrollbar');
    window.removeEventListener('wheel', blockScroll);
    window.removeEventListener('touchmove', blockScroll);
    window.removeEventListener('keydown', blockKeys);
    window.removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', onVisibility);
    if (changedScrollRestoration) history.scrollRestoration = originalScrollRestoration;
    window.scrollTo({top: 0, left: 0, behavior: 'instant'});
    if (document.activeElement === document.body || document.activeElement?.closest('.site-header')) {
      main.tabIndex = -1;
      main.focus({preventScroll: true});
    }
  }

  function drawFire(points, p, elapsed, dt) {
    if (!context) return;
    const c = context;
    c.clearRect(0, 0, width, height);
    const alpha = Math.min(p * 12, 1) * clamp((1 - p) * 8);
    c.save();
    c.globalAlpha = alpha;
    c.lineJoin = 'round';
    c.beginPath();
    points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
    c.closePath();
    c.shadowColor = '#ff590b'; c.shadowBlur = 28;
    c.strokeStyle = '#d94207'; c.lineWidth = 17; c.stroke();
    c.shadowColor = '#ffae25'; c.shadowBlur = 12;
    c.strokeStyle = '#ff9a16'; c.lineWidth = 7; c.stroke();
    c.shadowBlur = 5; c.strokeStyle = '#fff3b3'; c.lineWidth = 2; c.stroke();
    c.restore();

    // Short-lived embers lift off the advancing edge; emission is frame-rate independent.
    if (p > .025 && p < .92) {
      const count = Math.min(8, Math.ceil(dt * 150));
      for (let i = 0; i < count; i++) {
        const [x, y] = points[Math.floor(Math.random() * points.length)];
        sparks.push({x, y, vx: (x - width * .48) * .07, vy: -35 - Math.random() * 75, born: elapsed, life: .18 + Math.random() * .16});
      }
    }
    sparks = sparks.filter(s => elapsed - s.born < s.life);
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const s of sparks) {
      s.x += s.vx * dt; s.y += s.vy * dt;
      c.globalAlpha = clamp(1 - (elapsed - s.born) / s.life) * alpha;
      c.fillStyle = '#ffb542'; c.fillRect(s.x, s.y, 1.5, 2.5);
    }
    c.restore();
  }

  function animate(now) {
    if (state !== 'burning') return;
    const elapsed = (now - started) / 1000;
    // Brief ignition, then a fast expanding, irregular opening through the aerial layer.
    const p = clamp((elapsed - .08) / .95);
    const points = burnOutline(p, width, height, elapsed);
    stage.style.clipPath = burnClip(points, width, height);
    drawFire(points, p, elapsed, Math.min((now - previousTime) / 1000, .04));
    previousTime = now;
    if (p >= 1) { finish(); return; }
    frame = requestAnimationFrame(animate);
  }

  function onVisibility() { if (document.hidden && state === 'burning') finish(); }

  function ignite() {
    if (state !== 'intro') return;
    state = 'burning';
    if (motion.matches || !CSS.supports('clip-path', 'path(evenodd, "M0 0 H10 V10 H0 Z")')) {
      finish(); return;
    }
    layer = document.createElement('div');
    layer.className = 'intro-burn-layer';
    layer.setAttribute('aria-hidden', 'true');
    layer.inert = true;
    canvas = document.createElement('canvas');
    canvas.className = 'intro-burn-fire';
    layer.append(stage, canvas);
    document.body.append(layer);
    context = canvas.getContext('2d');
    // Keep the actual video frame, and anchor the real title page behind it.
    // No cloned video, sticky handoff, or scroll-driven opacity is involved.
    video?.pause();
    if (video && Number.isFinite(video.duration)) {
      try { video.currentTime = Math.max(0, video.duration - .035); } catch {}
    }
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual'; changedScrollRestoration = true;
    }
    const scrollbar = window.innerWidth - root.clientWidth;
    if (scrollbar > 0) document.body.style.setProperty('--burn-scrollbar', `${scrollbar}px`);
    root.classList.add('intro-burn-running');
    unlinkIntro();
    window.scrollTo({top: 0, left: 0, behavior: 'instant'});
    document.getElementById('loadingScreen')?.classList.add('is-hidden');
    window.addEventListener('wheel', blockScroll, {passive: false});
    window.addEventListener('touchmove', blockScroll, {passive: false});
    window.addEventListener('keydown', blockKeys);
    window.addEventListener('resize', resize, {passive: true});
    document.addEventListener('visibilitychange', onVisibility);
    resize();
    started = previousTime = performance.now();
    deadline = window.setTimeout(finish, 1600);
    frame = requestAnimationFrame(animate);
  }

  function checkEnd() {
    if (state !== 'intro') return;
    const remaining = intro.getBoundingClientRect().bottom - stage.offsetHeight - header.offsetHeight;
    if (remaining <= 2) ignite();
  }

  // Explicit content navigation skips the intro without pulling visitors away from their destination.
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const id = link.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if (state !== 'intro' || !target || !(target === main || main.contains(target))) return;
    event.preventDefault();
    finish();
    target.scrollIntoView({behavior: 'instant', block: 'start'});
    history.replaceState(null, '', `#${id}`);
  });
  motion.addEventListener('change', () => { if (motion.matches && state === 'burning') finish(); });
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

if (typeof document !== 'undefined') initIntroBurn();
