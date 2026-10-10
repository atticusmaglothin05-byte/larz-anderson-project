(() => {
  const section = document.getElementById('scrollSequence');
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
    document.body.classList.toggle('menu-open', open);
    document.querySelectorAll('body > main, body > section, body > footer').forEach((element) => {
      element.inert = open;
    });
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
    if (event.key === 'Tab' && !navigation.hidden) {
      const controls = [...header.querySelectorAll('a[href], button')].filter((element) => element.getClientRects().length);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  header.addEventListener('focusout', (event) => {
    if (!header.contains(event.relatedTarget)) setMenuOpen(false);
  });

  navigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenuOpen(false, true);
  });

  header.querySelector('.site-title').addEventListener('click', () => setMenuOpen(false));

  // Reveal decoded photographs with a sharp mask. Content remains visible without JS.
  if ('IntersectionObserver' in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        revealObserver.unobserve(entry.target);
        // Observe the unmasked figure: a fully clipped image has no intersection.
        const element = entry.target.matches('.project-photo')
          ? entry.target.querySelector('[data-reveal]') : entry.target;
        const image = element.querySelector('img');
        const reveal = () => {
          element.classList.remove('is-pending');
          element.classList.add('is-revealed');
        };
        if (!image || (image.complete && image.naturalWidth)) {
          if (image?.decode) image.decode().catch(() => {}).then(reveal);
          else reveal();
        } else {
          image.loading = 'eager';
          image.addEventListener('load', () => {
            if (image.decode) image.decode().catch(() => {}).then(reveal);
            else reveal();
          }, { once: true });
          image.addEventListener('error', reveal, { once: true });
          // A slow connection must never leave a photograph permanently masked.
          window.setTimeout(reveal, 6000);
        }
      });
    }, { threshold: 0.04, rootMargin: '0px 0px -5% 0px' });
    document.querySelectorAll('[data-reveal], [data-text-reveal]').forEach((element) => {
      element.classList.add('is-pending');
      revealObserver.observe(element.matches('[data-reveal]') ? element.closest('figure') : element);
    });
  }

  function syncHeader() { header.classList.toggle('is-scrolled', window.scrollY > 30); }
  window.addEventListener('scroll', syncHeader, { passive: true });
  syncHeader();

  // Direct source links expand the bibliography as well as navigating to it.
  function openSources() {
    if (window.location.hash === '#sources') document.querySelector('.sources-disclosure')?.setAttribute('open', '');
  }
  document.querySelectorAll('a[href="#sources"]').forEach((link) => {
    link.addEventListener('click', () => document.querySelector('.sources-disclosure')?.setAttribute('open', ''));
  });
  window.addEventListener('hashchange', openSources);
  openSources();

  // Photo viewing is independent of the scroll intro and its loading state.
  const photoDialog = document.getElementById('photoDialog');
  if (photoDialog && typeof photoDialog.showModal === 'function') {
    const dialogImage = document.getElementById('photoDialogImage');
    const dialogCaption = document.getElementById('photoDialogCaption');
    document.querySelectorAll('[data-photo-view]').forEach((button) => {
      button.addEventListener('click', () => {
        const image = button.querySelector('img');
        if (!image) return;
        dialogImage.src = button.dataset.photoFull || image.currentSrc || image.src;
        dialogImage.alt = image.alt;
        const caption = button.closest('figure')?.querySelector('figcaption');
        dialogCaption.textContent = caption ? [...caption.childNodes].map((node) => node.textContent.trim()).filter(Boolean).join(' · ') : image.alt;
        photoDialog.showModal();
        document.body.classList.add('photo-viewing');
      });
    });
    photoDialog.querySelector('.photo-close').addEventListener('click', () => photoDialog.close());
    photoDialog.addEventListener('click', (event) => {
      if (event.target === photoDialog) photoDialog.close();
    });
    photoDialog.addEventListener('close', () => {
      document.body.classList.remove('photo-viewing');
      dialogImage.removeAttribute('src');
    });
  }

  if (!section || !video) return;
  const stage = section.querySelector('.intro-stage');

  // Use a smaller encode on phones/tablets to reduce startup bandwidth.
  const mobile = window.matchMedia('(max-width: 760px)').matches;
  video.src = mobile
    ? 'assets/larz-intro-scroll-720.mp4?v=20261008'
    : 'assets/larz-intro-scroll.mp4?v=20261008';

  let duration = 0;
  let targetTime = 0;
  let renderedTime = 0;
  let ticking = false;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  function getProgress() {
    const rect = section.getBoundingClientRect();
    const scrollable = Math.max(section.offsetHeight - stage.offsetHeight, 1);
    return clamp(-rect.top / scrollable, 0, 1);
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
  video.addEventListener('error', () => {
    section.classList.add('intro-unavailable');
    hideLoader();
  }, { once: true });

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
