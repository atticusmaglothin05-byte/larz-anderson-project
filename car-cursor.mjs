const TAU = Math.PI * 2;
export const CAR_HEIGHT = 46;
export const TRACK_LIFETIME = 3400;
export const TRACK_DISTANCE = 760;
export const SMOKE_DISTANCE = 44;
export const TRAIL_QUOTE = 'Sometimes I stagger even myself with my genius';
export const LETTER_SPACING = 8.55;
const TRAIL_TEXT = TRAIL_QUOTE + '  ·  ';

function angleDifference(target, angle) {
  return ((target - angle + Math.PI) % TAU + TAU) % TAU - Math.PI;
}

export function trailOpacity(now, createdAt, distance, createdDistance) {
  const timeLeft = Math.max(0, 1 - (now - createdAt) / TRACK_LIFETIME);
  const distanceLeft = Math.max(0, 1 - (distance - createdDistance) / TRACK_DISTANCE);
  return .85 * Math.sqrt(timeLeft * distanceLeft);
}

function wheelPositions(x, y, angle, width, height) {
  const sin = Math.sin(angle), cos = Math.cos(angle);
  return [-1, 1].map(side => {
    const lateral = side * width * .34, rear = height * .29;
    return {x: x + lateral * cos - rear * sin, y: y + lateral * sin + rear * cos};
  });
}

export class CarTrail {
  constructor(width, height = CAR_HEIGHT, random = Math.random) {
    this.width = width;
    this.height = height;
    this.random = random;
    this.x = 0; this.y = 0; this.angle = 0;
    this.targetAngle = 0; this.directionX = 0; this.directionY = 0;
    this.directionOriginX = 0; this.directionOriginY = 0;
    this.lastFrame = 0;
    this.distance = 0; this.lastMove = 0;
    this.positioned = false;
    this.tracks = []; this.smoke = [];
    this.smokeDistance = 0;
    this.letterDistance = 0;
    this.letterIndex = 0;
  }

  reset() {
    this.positioned = false;
    this.tracks.length = this.smoke.length = 0;
    this.smokeDistance = 0;
    this.letterDistance = 0;
    this.letterIndex = 0;
    this.directionX = this.directionY = 0;
    this.targetAngle = this.angle;
    this.lastFrame = 0;
  }

  steer(now, immediate = false) {
    const elapsed = Math.max(0, Math.min(.05, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    const turn = angleDifference(this.targetAngle, this.angle);
    if (immediate || Math.abs(turn) < .002) this.angle = this.targetAngle;
    else {
      const change = turn * (1 - Math.exp(-elapsed / .075));
      this.angle += Math.max(-elapsed * 18, Math.min(elapsed * 18, change));
    }
  }

  move(x, y, now, animate = true) {
    if (!this.positioned) {
      this.x = x; this.y = y;
      this.directionOriginX = x; this.directionOriginY = y;
      this.lastMove = this.lastFrame = now; this.positioned = true;
      return;
    }
    this.steer(now, !animate);
    const dx = x - this.x, dy = y - this.y;
    const length = Math.hypot(dx, dy);
    if (now - this.lastMove > 250) {
      if (length >= .75) {
        this.directionX = dx / length; this.directionY = dy / length;
        this.targetAngle = Math.atan2(dy, dx) + Math.PI / 2;
      }
      this.x = x; this.y = y; this.lastMove = now;
      this.directionOriginX = x; this.directionOriginY = y;
      this.tracks.length = this.smoke.length = 0;
      this.smokeDistance = 0;
      this.letterDistance = 0;
      this.letterIndex = 0;
      return;
    }
    if (length < .75) {
      this.x = x; this.y = y; this.lastMove = now;
      return;
    }
    // Average direction over a short travel distance. Tiny alternating hand
    // movements no longer make the car snap between opposing headings.
    const headingX = x - this.directionOriginX, headingY = y - this.directionOriginY;
    const headingLength = Math.hypot(headingX, headingY);
    if (headingLength >= 3.5) {
      const blend = 1 - Math.exp(-headingLength / 10);
      if (!this.directionX && !this.directionY) {
        this.directionX = headingX / headingLength; this.directionY = headingY / headingLength;
      } else {
        this.directionX += (headingX / headingLength - this.directionX) * blend;
        this.directionY += (headingY / headingLength - this.directionY) * blend;
      }
      if (Math.hypot(this.directionX, this.directionY) > .2) {
        this.targetAngle = Math.atan2(this.directionY, this.directionX) + Math.PI / 2;
      }
      this.directionOriginX = x; this.directionOriginY = y;
    }
    if (!animate) this.angle = this.targetAngle;
    const angle = this.angle;
    const steps = Math.min(200, Math.max(1, Math.ceil(length / 4)));
    const stepLength = length / steps;
    for (let i = 1; i <= steps; i++) {
      const fraction = i / steps;
      const wheels = wheelPositions(this.x + dx * fraction, this.y + dy * fraction, angle, this.width, this.height);
      this.distance += stepLength;
      if (animate) {
        // Sample by distance, not event frequency: a straight sweep produces
        // the sentence in order, with the same spacing at every pointer speed.
        this.letterDistance += stepLength;
        while (this.letterDistance >= LETTER_SPACING) {
          this.letterDistance -= LETTER_SPACING;
          const sample = fraction - this.letterDistance / length;
          const positions = wheelPositions(this.x + dx * sample, this.y + dy * sample, angle, this.width, this.height);
          this.tracks.push({positions, angle: Math.atan2(dy, dx),
            letter: TRAIL_TEXT[this.letterIndex++ % TRAIL_TEXT.length],
            createdAt: now, distance: this.distance - this.letterDistance});
        }
        this.smokeDistance += stepLength;
        if (this.smokeDistance >= 19) {
          this.smokeDistance %= 19;
          for (const wheel of wheels) {
            const r = this.random;
            this.smoke.push({x: wheel.x, y: wheel.y, vx: -Math.sin(angle) * (3 + r() * 3) + (r() - .5) * 3,
              vy: Math.cos(angle) * (3 + r() * 3) + (r() - .5) * 3,
              size: 1.3 + r() * 1, createdAt: now, lifetime: 240 + r() * 100, distance: this.distance});
          }
        }
      }
    }
    this.x = x; this.y = y; this.lastMove = now;
    // Bounded even when the pointer emits more events than the display draws.
    this.tracks = this.tracks.slice(-100);
    this.smoke = this.smoke.slice(-32);
  }

  prune(now) {
    this.tracks = this.tracks.filter(track => trailOpacity(now, track.createdAt, this.distance, track.distance) > .001);
    this.smoke = this.smoke.filter(p => now - p.createdAt < p.lifetime && this.distance - p.distance < SMOKE_DISTANCE);
  }

  get animating() { return this.tracks.length > 0 || this.smoke.length > 0 || Math.abs(angleDifference(this.targetAngle, this.angle)) > .002; }
}

function initCarCursor() {
  // Touch interactions retain their normal behavior. The image must load before
  // the native cursor is hidden, so a missing asset cannot strand the pointer.
  const finePointer = window.matchMedia('(any-hover: hover) and (any-pointer: fine)');
  if (!finePointer.matches) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const sprite = new Image();
  sprite.decoding = 'async';
  sprite.src = new URL('./assets/huayra-cursor.png', import.meta.url).href;
  sprite.addEventListener('load', () => {
    const canvas = document.createElement('canvas');
    canvas.className = 'car-cursor-layer';
    canvas.setAttribute('aria-hidden', 'true');
    const context = canvas.getContext('2d');
    if (!context) return;
    document.body.append(canvas);
    const root = document.documentElement;
    const car = new CarTrail(CAR_HEIGHT * sprite.naturalWidth / sprite.naturalHeight);
    let width = 0, height = 0, visible = false, active = false, frame = 0;
    let interactive = false;

    function resize() {
      hide();
      width = window.innerWidth; height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      car.reset();
      wake();
    }

    function draw(now) {
      frame = 0;
      context.clearRect(0, 0, width, height);
      if (!active || !visible || !car.positioned) return;
      car.steer(now, reducedMotion.matches);
      car.prune(now);
      context.font = '700 11.4px ui-monospace, SFMono-Regular, Consolas, monospace';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      // The two tire prints are the sentence itself, following the driven path.
      for (const track of car.tracks) {
        const alpha = trailOpacity(now, track.createdAt, car.distance, track.distance);
        for (const position of track.positions) {
          context.save();
          context.translate(position.x, position.y);
          context.rotate(track.angle);
          // A thin light edge keeps black rubber lettering visible over the
          // dark site, while the filled letter still reads as a tire print.
          context.lineWidth = 1.235;
          context.strokeStyle = `rgba(220,220,207,${alpha * .68})`;
          context.fillStyle = `rgba(0,0,0,${alpha})`;
          context.strokeText(track.letter, 0, 0);
          context.fillText(track.letter, 0, 0);
          context.restore();
        }
      }
      for (const particle of car.smoke) {
        const age = (now - particle.createdAt) / 1000;
        const progress = (now - particle.createdAt) / particle.lifetime;
        const distanceFade = Math.max(0, 1 - (car.distance - particle.distance) / SMOKE_DISTANCE);
        const x = particle.x + particle.vx * age, y = particle.y + particle.vy * age;
        const radius = particle.size + progress * 3;
        const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `rgba(210,212,211,${.09 * (1 - progress) * distanceFade})`);
        gradient.addColorStop(1, 'rgba(210,212,211,0)');
        context.fillStyle = gradient;
        context.beginPath(); context.arc(x, y, radius, 0, TAU); context.fill();
      }
      context.save();
      context.translate(car.x, car.y);
      context.rotate(car.angle);
      // Centered on the real pointer, with no positional chase or input capture.
      context.shadowColor = interactive ? 'rgba(193,179,153,.6)' : 'rgba(0,0,0,.45)';
      context.shadowBlur = interactive ? 8 : 3;
      context.drawImage(sprite, -car.width / 2, -car.height / 2, car.width, car.height);
      context.restore();
      if (car.animating) wake();
    }

    function wake() { if (!frame) frame = requestAnimationFrame(draw); }
    function hide() {
      visible = active = false;
      root.classList.remove('has-car-cursor');
      car.reset();
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      context.clearRect(0, 0, width, height);
    }

    window.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || !finePointer.matches) { hide(); return; }
      // Native text/editing and dialog cursors are kept where they are useful.
      const nativeTarget = event.target.closest?.('input, textarea, select, [contenteditable="true"], iframe, dialog[open]');
      if (nativeTarget) { hide(); return; }
      active = visible = true;
      root.classList.add('has-car-cursor');
      interactive = !!event.target.closest?.('a, button, summary, [role="button"]');
      car.move(event.clientX, event.clientY, performance.now(), !reducedMotion.matches);
      wake();
    }, {passive: true});
    window.addEventListener('pointerdown', event => { if (event.pointerType !== 'mouse') hide(); }, {passive: true});
    document.addEventListener('pointerleave', hide);
    window.addEventListener('blur', hide);
    document.addEventListener('keydown', event => { if (event.key === 'Tab') hide(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) hide(); });
    document.addEventListener('toggle', event => { if (event.target.matches?.('dialog')) hide(); }, true);
    finePointer.addEventListener('change', hide);
    reducedMotion.addEventListener('change', () => { car.tracks.length = car.smoke.length = 0; wake(); });
    window.addEventListener('resize', resize, {passive: true});
    window.addEventListener('scroll', () => { car.tracks.length = car.smoke.length = 0; wake(); }, {passive: true});
    resize();
  }, {once: true});
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') initCarCursor();
