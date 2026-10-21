/*
 * hero-flow.js
 * Dots travelling along curved "rails" in an SVG behind your hero.
 *
 * Usage: add before </body>, after the hero markup:
 *   <script src="hero-flow.js" defer></script>
 *
 * Theme it from your CSS (optional):
 *   .hero { --flow-line: rgba(255,255,255,.14); --flow-dot: #7fd4ff; }
 */
(() => {
  const CONFIG = {
    target: '.hero, #hero, #top',   // selector(s) for the hero element; first match wins
    top: 0,                         // px: where the rails start, measured down from the top of the hero
    mobileTop: 80,                  // px: same, when the viewport is narrower than mobileBreakpoint
    mobileBreakpoint: 640,          // px viewport width
    maxHeight: 800,                 // px; rails only fill this much from the top of the target
    curve: 0.0,                     // 0 = straight lines, 1 = full S-curves; try 0.2 for a gentle drift
    lanes: 1,                       // number of rails (fewer on small screens)
    dotsPerLane: 11,
    speed: [35, 90],                // px per second, min/max
    radius: [1.8, 3],               // dot radius, min/max
    seed: 7,                        // change for a different layout
  };

  const NS = 'http://www.w3.org/2000/svg';
  // Try each selector in the order listed (a single comma-separated
  // querySelector would return whichever matches first in the page instead).
  const hero = CONFIG.target.split(',')
    .map((s) => document.querySelector(s.trim()))
    .find(Boolean);
  if (!hero) { console.warn('[hero-flow] no element matches', CONFIG.target); return; }

  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  // Small seeded RNG so the layout is the same on every load and resize.
  const rng = (s) => () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Sit behind the hero's content but above its own background.
  if (getComputedStyle(hero).position === 'static') hero.style.position = 'relative';
  hero.style.isolation = 'isolate';

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  const fade = 'linear-gradient(to bottom, #000 75%, transparent)';
  svg.style.cssText =
    'position:absolute;top:0;left:0;width:100%;z-index:-1;pointer-events:none;' +
    `-webkit-mask-image:${fade};mask-image:${fade};`;
  hero.prepend(svg);

  let lanes = [];
  let raf = 0;
  let last = 0;
  let visible = true;

  function el(name, attrs) {
    const node = document.createElementNS(NS, name);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  }

  function build() {
    stop();
    const rect = hero.getBoundingClientRect();
    const W = rect.width;
    const top = innerWidth < CONFIG.mobileBreakpoint ? CONFIG.mobileTop : CONFIG.top;
    const H = Math.min(rect.height - top, CONFIG.maxHeight);
    if (!W || H <= 0) return;
    svg.style.top = `${top}px`;
    svg.style.height = `${H}px`;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.replaceChildren();

    const rand = rng(CONFIG.seed);
    const between = (a, b) => a + rand() * (b - a);
    const n = W < 600 ? Math.ceil(CONFIG.lanes * 0.6) : CONFIG.lanes;
    const gap = H / n;
    lanes = [];

    for (let i = 0; i < n; i++) {
      const y0 = gap * (i + 0.5) + (rand() - 0.5) * gap * 0.3;
      const jog = () => Math.max(8, Math.min(H - 8, y0 + (rand() - 0.5) * gap * 3 * CONFIG.curve));
      const y1 = jog();
      const y2 = jog();

      // Two S-curves per rail, joined by straight runs.
      const xa = W * between(0.15, 0.35), xb = xa + W * between(0.12, 0.22);
      const xc = W * between(0.6, 0.75),  xd = xc + W * between(0.12, 0.22);
      const m1 = (xa + xb) / 2, m2 = (xc + xd) / 2;
      const d =
        `M-20 ${y0} H${xa} C${m1} ${y0} ${m1} ${y1} ${xb} ${y1} ` +
        `H${xc} C${m2} ${y1} ${m2} ${y2} ${xd} ${y2} H${W + 20}`;

      const path = el('path', {
        d, fill: 'none', 'stroke-width': 1,
        stroke: 'var(--flow-line, rgba(127,127,127,.22))',
      });
      svg.appendChild(path);
      const len = path.getTotalLength();

      const dots = [];
      for (let j = 0; j < CONFIG.dotsPerLane; j++) {
        const r = between(...CONFIG.radius);
        const halo = el('circle', { r: r * 3, fill: 'var(--flow-dot, #7fd4ff)' });
        const dot = el('circle', { r, fill: 'var(--flow-dot, #7fd4ff)' });
        svg.append(halo, dot);
        dots.push({ halo, dot, pos: rand() * len, speed: between(...CONFIG.speed) });
      }
      lanes.push({ path, len, dots });
    }

    for (const lane of lanes) for (const d of lane.dots) place(lane, d);
    run();
  }

  function place(lane, d) {
    const p = lane.path.getPointAtLength(d.pos);
    const f = d.pos / lane.len;
    const edge = Math.min(1, f / 0.08, (1 - f) / 0.08); // fade in/out at the ends
    d.dot.setAttribute('cx', p.x);  d.dot.setAttribute('cy', p.y);
    d.halo.setAttribute('cx', p.x); d.halo.setAttribute('cy', p.y);
    d.dot.setAttribute('opacity', 0.9 * edge);
    d.halo.setAttribute('opacity', 0.14 * edge);
  }

  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    for (const lane of lanes) {
      for (const d of lane.dots) {
        d.pos = (d.pos + d.speed * dt) % lane.len;
        place(lane, d);
      }
    }
    raf = requestAnimationFrame(tick);
  }

  function run() {
    if (raf || !visible || reduce.matches || !lanes.length) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  // Rebuild on resize (debounced); pause when offscreen; respect reduced motion.
  let timer;
  new ResizeObserver(() => { clearTimeout(timer); timer = setTimeout(build, 150); }).observe(hero);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? run() : stop(); }).observe(hero);
  reduce.addEventListener('change', () => (reduce.matches ? stop() : run()));
})();
