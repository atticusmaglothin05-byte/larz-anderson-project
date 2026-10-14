export function smoothstep(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

export function introTransition(offset, stageHeight) {
  const raw = Math.max(0, Math.min(1, 1 - offset / Math.max(stageHeight, 1)));
  const blend = smoothstep(raw);
  return {
    blend,
    lift: Math.max(0, Math.min(stageHeight, offset)),
    videoOpacity: 1 - blend,
    titleOpacity: smoothstep((raw - .2) / .8),
    inset: (1 - blend) * 6,
    scale: 1 + (1 - blend) * .045
  };
}

function initScrollScenes() {
  const root = document.documentElement;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (motion.matches) return;
  const scenes = [
    ['#reading', 'introduction'], ['#museum', 'history'], ['#analysis', 'discourse'],
    ['#place', 'place'], ['.fact-teaser', 'teaser'], ['.project-about', 'about'],
    ['.fact-introduction', 'facts-title'], ['.fact-stage', 'facts-photo'], ['.fact-return', 'facts-return']
  ];
  const sections = scenes.map(([selector, scene]) => {
    const element = document.querySelector(selector);
    if (element) element.dataset.scene = scene;
    return element;
  }).filter(Boolean);

  if ('IntersectionObserver' in window) {
    root.classList.add('has-scroll-scenes');
    // Each paragraph enters when it is reached; long articles do not wait for
    // an entire text column to fit in the viewport.
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        entry.target.classList.remove('scene-pending');
        entry.target.classList.add('scene-visible');
      }
    }, {threshold: .02, rootMargin: '0px 0px -3% 0px'});
    document.querySelectorAll('.prose > p, .fact-teaser .teaser-title, .fact-meta, .fact-stage, .fact-return .text-link, .project-about h2').forEach(element => {
      element.classList.add('scene-pending');
      const index = element.matches('.prose > p') ? [...element.parentElement.children].indexOf(element) : 0;
      element.style.setProperty('--scene-delay', `${Math.min(index, 3) * 55}ms`);
      observer.observe(element);
    });
  }

  const intro = document.getElementById('scrollSequence');
  const main = document.getElementById('mainContent');
  const header = document.getElementById('siteHeader');
  const hero = document.querySelector('.project-hero');
  const stage = intro?.querySelector('.intro-stage');
  const video = intro?.querySelector('video');
  let bridgeEnabled = !!(intro && main && header && hero && stage && video);
  let requested = false;
  if (bridgeEnabled) root.classList.add('intro-transition-ready');

  function render() {
    requested = false;
    if (motion.matches) return;
    if (bridgeEnabled) {
      const offset = main.getBoundingClientRect().top - header.offsetHeight;
      const transition = introTransition(offset, stage.offsetHeight);
      hero.style.setProperty('--bridge-opacity', transition.blend.toFixed(4));
      hero.style.setProperty('--bridge-lift', `${transition.lift.toFixed(2)}px`);
      hero.style.setProperty('--bridge-inset', `${transition.inset.toFixed(3)}%`);
      hero.style.setProperty('--bridge-scale', transition.scale.toFixed(4));
      hero.style.setProperty('--bridge-title-opacity', transition.titleOpacity.toFixed(4));
      hero.style.setProperty('--bridge-title-lift', `${((1 - transition.titleOpacity) * 28).toFixed(2)}px`);
      hero.style.pointerEvents = transition.blend > .97 ? '' : 'none';
      video.style.opacity = transition.videoOpacity.toFixed(4);
      intro.style.setProperty('--bridge-progress-opacity', transition.videoOpacity.toFixed(4));
    }
    const viewport = window.innerHeight;
    for (const section of sections) {
      const rect = section.getBoundingClientRect();
      if (rect.bottom < -80 || rect.top > viewport + 80) continue;
      const progress = Math.max(0, Math.min(1, (viewport - rect.top) / (viewport + Math.min(rect.height, viewport * 1.5))));
      section.style.setProperty('--scene-drift', `${((progress - .5) * 20).toFixed(2)}px`);
    }
  }

  function requestRender() {
    if (requested || motion.matches) return;
    requested = true;
    requestAnimationFrame(render);
  }

  function disableBridge() {
    bridgeEnabled = false;
    root.classList.remove('intro-transition-ready');
    if (video) video.style.opacity = '';
    if (hero) hero.style.pointerEvents = '';
    requestRender();
  }

  video?.addEventListener('error', disableBridge);
  video?.addEventListener('loadedmetadata', requestRender);
  motion.addEventListener('change', () => {
    if (!motion.matches) return;
    disableBridge();
    root.classList.remove('has-scroll-scenes');
    document.querySelectorAll('.scene-pending').forEach(element => element.classList.remove('scene-pending'));
    sections.forEach(element => element.style.removeProperty('--scene-drift'));
  });
  window.addEventListener('scroll', requestRender, {passive: true});
  window.addEventListener('resize', requestRender, {passive: true});
  window.addEventListener('pageshow', requestRender);
  window.addEventListener('load', requestRender, {once: true});
  render();
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') initScrollScenes();
