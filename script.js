(() => {
  const section = document.getElementById('scrollSequence');
  const stage = section.querySelector('.intro-stage');
  const header = document.getElementById('siteHeader');
  const menuToggle = document.getElementById('menuToggle');
  const navigation = document.getElementById('siteNavigation');
  const video = document.getElementById('introVideo');
  const loadingScreen = document.getElementById('loadingScreen');
  const scrollCue = document.getElementById('scrollCue');
  const progressBar = document.getElementById('introProgress');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setMenuOpen(open, restoreFocus = false) {
    navigation.hidden = !open;
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    if (restoreFocus) menuToggle.focus();
  }

  menuToggle.addEventListener('click', () => {
    setMenuOpen(menuToggle.getAttribute('aria-expanded') !== 'true');
  });

  document.addEventListener('click', (event) => {
    if (!header.contains(event.target)) setMenuOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !navigation.hidden) setMenuOpen(false, true);
  });

  header.addEventListener('focusout', (event) => {
    if (!header.contains(event.relatedTarget)) setMenuOpen(false);
  });

  navigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenuOpen(false, true);
  });

  header.querySelector('.site-title').addEventListener('click', () => setMenuOpen(false));

  // Use a smaller encode on phones/tablets to reduce startup bandwidth.
  const mobile = window.matchMedia('(max-width: 760px)').matches;
  video.src = mobile
    ? 'assets/larz-intro-scroll-720.mp4'
    : 'assets/larz-intro-scroll.mp4';

  let duration = 0;
  let targetTime = 0;
  let renderedTime = 0;
  let ticking = false;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  function getProgress() {
    const rect = section.getBoundingClientRect();
    const scrollable = Math.max(section.offsetHeight - stage.offsetHeight, 1);
    return clamp((header.offsetHeight - rect.top) / scrollable, 0, 1);
  }

  function updateTarget() {
    if (!duration || reduceMotion) return;

    const progress = getProgress();
    targetTime = progress * Math.max(duration - 0.035, 0);
    progressBar.style.transform = `scaleX(${progress})`;
    scrollCue.classList.toggle('is-hidden', progress > 0.035);

    if (!ticking) {
      ticking = true;
      requestAnimationFrame(renderFrame);
    }
  }

  function renderFrame() {
    // A small amount of interpolation prevents wheel/trackpad steps from looking abrupt.
    renderedTime += (targetTime - renderedTime) * 0.28;

    if (video.readyState >= 2 && Math.abs(video.currentTime - renderedTime) > 0.012) {
      video.currentTime = clamp(renderedTime, 0, duration || 0);
    }

    if (Math.abs(targetTime - renderedTime) > 0.006) {
      requestAnimationFrame(renderFrame);
    } else {
      renderedTime = targetTime;
      if (video.readyState >= 2) {
        video.currentTime = clamp(renderedTime, 0, duration || 0);
      }
      ticking = false;
    }
  }

  function hideLoader() {
    loadingScreen.classList.add('is-hidden');
  }

  video.addEventListener('loadedmetadata', () => {
    duration = Number.isFinite(video.duration) ? video.duration : 0;

    if (reduceMotion) {
      video.currentTime = Math.min(duration * 0.72, Math.max(duration - 0.05, 0));
      progressBar.style.transform = 'scaleX(1)';
      hideLoader();
      return;
    }

    const initialProgress = getProgress();
    targetTime = initialProgress * Math.max(duration - 0.035, 0);
    renderedTime = targetTime;
    video.currentTime = targetTime;
    progressBar.style.transform = `scaleX(${initialProgress})`;
    scrollCue.classList.toggle('is-hidden', initialProgress > 0.035);
  });

  video.addEventListener('loadeddata', hideLoader, { once: true });
  video.addEventListener('canplay', hideLoader, { once: true });

  // Never leave the visitor trapped behind the loader if the network is slow.
  window.setTimeout(hideLoader, 5000);

  if (!reduceMotion) {
    window.addEventListener('scroll', updateTarget, { passive: true });
    window.addEventListener('resize', updateTarget, { passive: true });

    // iOS can restrict video seeking until the media element has been activated once.
    // A muted play/pause on the first touch unlocks it without visibly playing the intro.
    window.addEventListener('touchstart', () => {
      const playAttempt = video.play();
      if (playAttempt && typeof playAttempt.then === 'function') {
        playAttempt.then(() => video.pause()).catch(() => {});
      }
    }, { once: true, passive: true });
  }

  video.load();
})();
