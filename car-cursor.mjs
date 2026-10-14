const TAU = Math.PI * 2;
export const CAR_HEIGHT = 46;
export const TRACK_LIFETIME = 720;
export const TRACK_DISTANCE = 100;

export function trailOpacity(now, createdAt, distance, createdDistance) {
  const timeLeft = Math.max(0, 1 - (now - createdAt) / TRACK_LIFETIME);
  const distanceLeft = Math.max(0, 1 - (distance - createdDistance) / TRACK_DISTANCE);
  return .22 * timeLeft * distanceLeft;
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
    this.distance = 0; this.lastMove = 0;
    this.positioned = false;
    this.tracks = []; this.smoke = [];
    this.smokeDistance = 0;
  }

  reset() {
    this.positioned = false;
    this.tracks.length = this.smoke.length = 0;
    this.smokeDistance = 0;
  }

  move(x, y, now, animate = true) {
    if (!this.positioned) {
      this.x = x; this.y = y;
      this.lastMove = now; this.positioned = true;
      return;
    }
    const dx = x - this.x, dy = y - this.y;
    const length = Math.hypot(dx, dy);
    if (now - this.lastMove > 250) {
      if (length >= .75) this.angle = Math.atan2(dy, dx) + Math.PI / 2;
      this.x = x; this.y = y; this.lastMove = now;
      this.tracks.length = this.smoke.length = 0;
      this.smokeDistance = 0;
      return;
    }
    if (length < .75) {
      this.x = x; this.y = y; this.lastMove = now;
      return;
    }
    // The cutout faces up. Its nose follows the actual movement vector.
    const nextAngle = Math.atan2(dy, dx) + Math.PI / 2;
    const turn = ((nextAngle - this.angle + Math.PI) % TAU + TAU) % TAU - Math.PI;
    const steps = Math.min(90, Math.max(1, Math.ceil(length / 4)));
    let previous = wheelPositions(this.x, this.y, this.angle, this.width, this.height);
    for (let i = 1; i <= steps; i++) {
      const fraction = i / steps, angle = this.angle + turn * fraction;
      const wheels = wheelPositions(this.x + dx * fraction, this.y + dy * fraction, angle, this.width, this.height);
      this.distance += length / steps;
      if (animate) {
        this.tracks.push({from: previous, to: wheels, createdAt: now, distance: this.distance});
        this.smokeDistance += length / steps;
        if (this.smokeDistance >= 13) {
          this.smokeDistance %= 13;
          for (const wheel of wheels) {
            const r = this.random;
            this.smoke.push({x: wheel.x, y: wheel.y, vx: -Math.sin(angle) * (7 + r() * 5) + (r() - .5) * 7,
              vy: Math.cos(angle) * (7 + r() * 5) + (r() - .5) * 7,
              size: 1.5 + r() * 1.6, createdAt: now, lifetime: 380 + r() * 220, distance: this.distance});
          }
        }
      }
      previous = wheels;
    }
    this.x = x; this.y = y; this.angle = nextAngle; this.lastMove = now;
    // Bounded even when the pointer emits more events than the display draws.
    this.tracks = this.tracks.slice(-90);
    this.smoke = this.smoke.slice(-40);
  }

  prune(now) {
    this.tracks = this.tracks.filter(track => trailOpacity(now, track.createdAt, this.distance, track.distance) > .001);
    this.smoke = this.smoke.filter(p => now - p.createdAt < p.lifetime && this.distance - p.distance < TRACK_DISTANCE);
  }

  get animating() { return this.tracks.length > 0 || this.smoke.length > 0; }
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
      car.prune(now);
      context.lineWidth = 1.6;
      context.lineCap = 'round';
      // Two slim, gently translucent tread marks, clipped by age and travel.
      for (const track of car.tracks) {
        context.strokeStyle = `rgba(193,183,163,${trailOpacity(now, track.createdAt, car.distance, track.distance)})`;
        context.setLineDash([2.5, 2]);
        context.lineDashOffset = -track.distance;
        for (let side = 0; side < 2; side++) {
          context.beginPath();
          context.moveTo(track.from[side].x, track.from[side].y);
          context.lineTo(track.to[side].x, track.to[side].y);
          context.stroke();
        }
      }
      context.setLineDash([]);
      for (const particle of car.smoke) {
        const age = (now - particle.createdAt) / 1000;
        const progress = (now - particle.createdAt) / particle.lifetime;
        const distanceFade = Math.max(0, 1 - (car.distance - particle.distance) / TRACK_DISTANCE);
        const x = particle.x + particle.vx * age, y = particle.y + particle.vy * age;
        const radius = particle.size + progress * 5;
        const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `rgba(210,212,211,${.13 * (1 - progress) * distanceFade})`);
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
