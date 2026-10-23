export function smoothstep(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
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

  let requested = false;

  function render() {
    requested = false;
    if (motion.matches) return;
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

  motion.addEventListener('change', () => {
    if (!motion.matches) return;
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
