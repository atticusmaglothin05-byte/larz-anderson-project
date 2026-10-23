// Content stays readable throughout; motion adds emphasis without gating access.
function initScrollScenes() {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  if (motion.matches || !('IntersectionObserver' in window)) return;
  for (const [selector, scene] of [['#reading', 'introduction'], ['#museum', 'history'], ['#analysis', 'discourse'], ['#place', 'place']]) {
    const section = document.querySelector(selector);
    if (section) section.dataset.scene = scene;
  }
  root.classList.add('has-scroll-scenes');
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      entry.target.classList.add('scene-enter');
    }
  }, {threshold: 0, rootMargin: '0px 0px 12% 0px'});
  document.querySelectorAll('.project-photo, [data-text-reveal], .reading-lab, .reading-perspective, .teaser-title').forEach(element => observer.observe(element));
  motion.addEventListener('change', () => {
    if (!motion.matches) return;
    observer.disconnect();
    root.classList.remove('has-scroll-scenes');
  });
}
if (typeof document !== 'undefined') initScrollScenes();
