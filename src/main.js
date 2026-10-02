import './style.css';
import 'lenis/dist/lenis.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { createViewer } from './three/viewer.js';

gsap.registerPlugin(ScrollTrigger);

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

document.body.classList.add('is-loading');
$('#year').textContent = new Date().getFullYear();

/* ------------------------------ Smooth scroll ------------------------------ */
const lenis = new Lenis({ lerp: 0.09, smoothWheel: !reduceMotion });
lenis.stop();
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

/* ------------------------------ 3D viewers ------------------------------ */
const heroHint = $('#hero-hint');
const heroViewer = createViewer($('#hero-canvas'), {
  cake: 'rose',
  autoRotateSpeed: 1.4,
  onInteract: () => heroHint.classList.add('is-hidden'),
});

const showroomHint = $('#showroom-hint');
const showroomViewer = createViewer($('#showroom-canvas'), {
  cake: 'chocolat',
  pedestal: true,
  float: false,
  autoRotateSpeed: 2,
  onInteract: () => showroomHint.classList.add('is-hidden'),
});

/* ------------------------------ Split text ------------------------------ */
function splitWords(el) {
  const nodes = [...el.childNodes];
  el.textContent = '';
  const inners = [];
  const wrap = (content) => {
    const outer = document.createElement('span');
    const inner = document.createElement('span');
    outer.className = 'split-word';
    inner.append(content);
    outer.append(inner);
    inners.push(inner);
    return outer;
  };
  for (const node of nodes) {
    if (node.nodeType !== Node.TEXT_NODE) {
      el.append(wrap(node));
      continue;
    }
    for (const part of node.textContent.split(/([ \t\n]+)/)) {
      if (!part) continue;
      el.append(/^[ \t\n]+$/.test(part) ? document.createTextNode(' ') : wrap(document.createTextNode(part)));
    }
  }
  return inners;
}

$$('[data-split]').forEach((el) => {
  const words = splitWords(el);
  gsap.from(words, {
    yPercent: 110,
    rotate: 4,
    duration: 1.1,
    ease: 'expo.out',
    stagger: 0.06,
    scrollTrigger: { trigger: el, start: 'top 85%' },
  });
});

/* ------------------------------ Reveals ------------------------------ */
gsap.set('[data-reveal]', { opacity: 0, y: 40 });
ScrollTrigger.batch('[data-reveal]', {
  start: 'top 88%',
  once: true,
  onEnter: (batch) =>
    gsap.to(batch, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.12, overwrite: true }),
});

$$('.reveal-clip').forEach((fig) => {
  gsap.fromTo(
    fig,
    { clipPath: 'inset(100% 0% 0% 0% round 28px)' },
    {
      clipPath: 'inset(0% 0% 0% 0% round 28px)',
      duration: 1.4,
      ease: 'expo.inOut',
      scrollTrigger: { trigger: fig, start: 'top 80%' },
    },
  );
  gsap.from($('img', fig), {
    scale: 1.35,
    duration: 1.8,
    ease: 'expo.out',
    scrollTrigger: { trigger: fig, start: 'top 80%' },
  });
});

/* ------------------------------ Parallax ------------------------------ */
if (!reduceMotion) {
  $$('[data-speed]').forEach((el) => {
    const speed = parseFloat(el.dataset.speed);
    const inHero = !!el.closest('.hero');
    const section = el.closest('section') ?? el;
    if (inHero) {
      gsap.to(el, {
        y: () => -speed * window.innerHeight * 0.45,
        ease: 'none',
        scrollTrigger: { trigger: section, start: 'top top', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
      });
    } else {
      gsap.fromTo(
        el,
        { y: () => speed * 120 },
        {
          y: () => -speed * 120,
          ease: 'none',
          scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
        },
      );
    }
  });

  $$('[data-inner-parallax]').forEach((img) => {
    gsap.fromTo(
      img,
      { yPercent: -8 },
      {
        yPercent: 0,
        ease: 'none',
        scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
      },
    );
  });

  // Mouse-driven depth layers in the hero (uses the CSS `translate` property so it
  // composes with the scroll-driven `transform`).
  const layers = $$('[data-depth]').map((el) => ({ el, depth: parseFloat(el.dataset.depth), x: 0, y: 0 }));
  const mouse = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    mouse.x = e.clientX / window.innerWidth - 0.5;
    mouse.y = e.clientY / window.innerHeight - 0.5;
  });
  gsap.ticker.add(() => {
    for (const l of layers) {
      l.x += (mouse.x * l.depth * -40 - l.x) * 0.06;
      l.y += (mouse.y * l.depth * -40 - l.y) * 0.06;
      l.el.style.translate = `${l.x.toFixed(2)}px ${l.y.toFixed(2)}px`;
    }
  });

  gsap.to('.hero__text', {
    yPercent: -30,
    opacity: 0,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });
  gsap.to('.hero__stage', {
    yPercent: 18,
    scale: 0.88,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });
}

ScrollTrigger.create({
  trigger: '.hero',
  start: 'top top',
  end: 'bottom top',
  scrub: true,
  onUpdate: (self) => (heroViewer.stage.rotation.y = self.progress * Math.PI * 2),
});

/* ------------------------------ Marquee ------------------------------ */
const marquees = $$('.marquee__row').map((row) => {
  const track = $('.marquee__track', row);
  row.append(track.cloneNode(true), track.cloneNode(true));
  const dir = Number(row.dataset.dir);
  const tween = gsap.fromTo(
    $$('.marquee__track', row),
    { xPercent: dir > 0 ? 0 : -100 },
    { xPercent: dir > 0 ? -100 : 0, duration: 28, ease: 'none', repeat: -1 },
  );
  return tween;
});

let scrollBoost = 0;
lenis.on('scroll', ({ velocity }) => {
  scrollBoost = Math.max(scrollBoost, Math.min(Math.abs(velocity) * 0.25, 6));
});
gsap.ticker.add(() => {
  scrollBoost *= 0.92;
  const speed = 1 + (reduceMotion ? 0 : scrollBoost);
  marquees.forEach((t) => t.timeScale(speed));
});

/* ------------------------------ Showroom ------------------------------ */
const CAKE_INFO = {
  rose: {
    tag: 'La signature',
    name: 'Rose Nada',
    desc: "Le gâteau de notre logo : une génoise moelleuse, une crème légère, un glaçage rose qui coule gourmand et la cerise sur le gâteau.",
    list: ['Génoise vanille', 'Crème légère', 'Glaçage rose'],
  },
  chocolat: {
    tag: 'Le gourmand',
    name: 'Chocolat Miroir',
    desc: "Un fondant au chocolat intense, nappé d'un glaçage miroir ultra brillant, couronné de copeaux de chocolat et de pétales de rose.",
    list: ['Chocolat noir', 'Glaçage miroir', 'Copeaux de chocolat'],
  },
  noix: {
    tag: 'Le raffiné',
    name: 'Bûche aux Noix',
    desc: 'Un biscuit aux éclats de noix, des rosettes de crème onctueuse, des cerneaux de noix et quelques pétales de rose séchés.',
    list: ['Éclats de noix', 'Crème onctueuse', 'Pétales de rose'],
  },
};

const tabs = $$('.cake-tab');
const infoEls = [$('#cake-tag'), $('#cake-name'), $('#cake-desc'), $('#cake-list')];

function renderInfo(key) {
  const info = CAKE_INFO[key];
  $('#cake-tag').textContent = info.tag;
  $('#cake-name').textContent = info.name;
  $('#cake-desc').textContent = info.desc;
  $('#cake-list').replaceChildren(
    ...info.list.map((item) => Object.assign(document.createElement('li'), { textContent: item })),
  );
}

function selectCake(key, animate = true) {
  tabs.forEach((t) => {
    const active = t.dataset.cake === key;
    t.classList.toggle('is-active', active);
    t.setAttribute('aria-selected', active);
  });
  showroomViewer.setCake(key);
  if (!animate) return renderInfo(key);
  gsap
    .timeline()
    .to(infoEls, { opacity: 0, y: -16, duration: 0.3, stagger: 0.04, ease: 'power2.in' })
    .add(() => renderInfo(key))
    .to(infoEls, { opacity: 1, y: 0, duration: 0.6, stagger: 0.07, ease: 'power3.out' });
}

tabs.forEach((tab) => tab.addEventListener('click', () => selectCake(tab.dataset.cake)));
selectCake('chocolat', false);

const autoBtn = $('#autorotate');
autoBtn.addEventListener('click', () => {
  const on = autoBtn.getAttribute('aria-pressed') !== 'true';
  autoBtn.setAttribute('aria-pressed', on);
  showroomViewer.setAutoRotate(on);
});

/* ------------------------------ Créations (horizontal) ------------------------------ */
const mm = gsap.matchMedia();
mm.add('(min-width: 900px)', () => {
  const section = $('.creations');
  const track = $('.creations__track');
  const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
  section.classList.add('is-pinned');

  const tween = gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: () => `+=${distance()}`,
      pin: true,
      scrub: 1,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });

  $$('.card__media img', track).forEach((img) => {
    gsap.fromTo(
      img,
      { xPercent: -6 },
      {
        xPercent: 6,
        ease: 'none',
        scrollTrigger: { trigger: img.closest('.card'), containerAnimation: tween, start: 'left right', end: 'right left', scrub: true },
      },
    );
  });

  $$('.card', track).forEach((card) => {
    gsap.from(card, {
      y: 80,
      rotate: 4,
      opacity: 0,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 95%' },
    });
  });

  return () => section.classList.remove('is-pinned');
});

/* ------------------------------ 3D tilt cards ------------------------------ */
if (finePointer) {
  $$('[data-tilt]').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      gsap.to(card, {
        rotationY: (px - 0.5) * 16,
        rotationX: (0.5 - py) * 16,
        transformPerspective: 900,
        duration: 0.5,
        ease: 'power2.out',
      });
      card.style.setProperty('--gx', `${px * 100}%`);
      card.style.setProperty('--gy', `${py * 100}%`);
      card.style.setProperty('--glare', 1);
    });
    card.addEventListener('pointerleave', () => {
      gsap.to(card, { rotationY: 0, rotationX: 0, duration: 1, ease: 'elastic.out(1, 0.5)' });
      card.style.setProperty('--glare', 0);
    });
  });
}

/* ------------------------------ Vitrine 360 carousel ------------------------------ */
{
  const scene = $('#ring-scene');
  const ring = $('#ring');
  const items = [...ring.children];
  const step = 360 / items.length;
  let radius = 0;
  let rot = 0;
  let vel = 0;
  let dragging = false;
  let lastX = 0;
  const auto = reduceMotion ? 0 : 0.12;

  const layout = () => {
    const w = items[0].offsetWidth;
    radius = Math.round((w / 2 / Math.tan(Math.PI / items.length)) * 1.4);
    items.forEach((item, i) => (item.style.transform = `rotateY(${i * step}deg) translateZ(${radius}px)`));
  };
  layout();
  new ResizeObserver(layout).observe(items[0]);

  scene.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    scene.setPointerCapture(e.pointerId);
  });
  scene.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    rot += dx * 0.3;
    vel = dx * 0.3;
  });
  const release = () => (dragging = false);
  scene.addEventListener('pointerup', release);
  scene.addEventListener('pointercancel', release);

  lenis.on('scroll', ({ velocity }) => {
    if (!dragging && !reduceMotion) vel += velocity * 0.01;
  });

  let visible = false;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(scene);

  gsap.ticker.add(() => {
    if (!visible) return;
    if (!dragging) {
      vel += (auto - vel) * 0.04;
      rot += vel;
    }
    ring.style.transform = `translateZ(${-radius}px) rotateX(-8deg) rotateY(${rot}deg)`;
    items.forEach((item, i) => {
      const facing = Math.cos(((i * step + rot) * Math.PI) / 180);
      item.style.opacity = (0.45 + 0.55 * (facing + 1) / 2).toFixed(3);
    });
  });
}

/* ------------------------------ Cursor & magnetic ------------------------------ */
if (finePointer) {
  const dot = $('.cursor');
  const ringEl = $('.cursor-ring');
  const dx = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' });
  const dy = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' });
  const rx = gsap.quickTo(ringEl, 'x', { duration: 0.5, ease: 'power3' });
  const ry = gsap.quickTo(ringEl, 'y', { duration: 0.5, ease: 'power3' });
  window.addEventListener('pointermove', (e) => {
    dx(e.clientX);
    dy(e.clientY);
    rx(e.clientX);
    ry(e.clientY);
  });

  const hoverSel = 'a, button, [data-tilt]';
  const dragSel = '.hero__canvas, .showroom__canvas, .ring-scene';
  document.addEventListener('pointerover', (e) => {
    ringEl.classList.toggle('is-drag', !!e.target.closest(dragSel));
    ringEl.classList.toggle('is-hover', !e.target.closest(dragSel) && !!e.target.closest(hoverSel));
  });

  $$('[data-magnetic]').forEach((btn) => {
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      gsap.to(btn, {
        x: (e.clientX - r.left - r.width / 2) * 0.3,
        y: (e.clientY - r.top - r.height / 2) * 0.4,
        duration: 0.4,
        ease: 'power3.out',
      });
    });
    btn.addEventListener('pointerleave', () => gsap.to(btn, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)' }));
  });
}

/* ------------------------------ Nav, menu, progress ------------------------------ */
const nav = $('.nav');
const burger = $('.nav__burger');
const menu = $('.mobile-menu');
const progress = $('.scroll-progress');

function toggleMenu(open = !menu.classList.contains('is-open')) {
  menu.classList.toggle('is-open', open);
  menu.setAttribute('aria-hidden', !open);
  menu.inert = !open;
  burger.setAttribute('aria-expanded', open);
  open ? lenis.stop() : lenis.start();
}
burger.addEventListener('click', () => toggleMenu());

lenis.on('scroll', ({ scroll, limit, direction }) => {
  nav.classList.toggle('is-hidden', direction === 1 && scroll > 300 && !menu.classList.contains('is-open'));
  progress.style.transform = `scaleX(${limit ? scroll / limit : 0})`;
});

$$('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const target = a.getAttribute('href');
    if (target.length < 2) return;
    e.preventDefault();
    if (menu.classList.contains('is-open')) toggleMenu(false);
    lenis.scrollTo(target, { duration: 1.6 });
  });
});

/* ------------------------------ Preloader & intro ------------------------------ */
const heroLines = $$('.hero__title .line > span');
gsap.set(heroLines, { yPercent: 115, rotate: 3 });
gsap.set('.hero__anim', { opacity: 0, y: 40 });
gsap.set('.floater, .bubble', { scale: 0, opacity: 0 });
gsap.set('.nav', { opacity: 0, y: -30 });

function loadAssets() {
  const images = $$('img')
    .filter((img) => !img.complete)
    .map(
      (img) =>
        new Promise((res) => {
          img.addEventListener('load', res, { once: true });
          img.addEventListener('error', res, { once: true });
        }),
    );
  const minDelay = new Promise((res) => setTimeout(res, 1400));
  return Promise.all([...images, document.fonts.ready, minDelay]);
}

const counter = { v: 0 };
const countEl = $('.preloader__count span');
const barEl = $('.preloader__bar span');
const drawCount = () => {
  countEl.textContent = Math.round(counter.v);
  barEl.style.transform = `scaleX(${counter.v / 100})`;
};

gsap.to('.preloader__logo', { clipPath: 'inset(0% 0 0 0)', duration: 1.2, ease: 'expo.out', delay: 0.1 });
const fakeProgress = gsap.to(counter, { v: 85, duration: 2.4, ease: 'power2.out', onUpdate: drawCount });

loadAssets().then(() => {
  fakeProgress.kill();
  gsap
    .timeline()
    .to(counter, { v: 100, duration: 0.5, ease: 'power2.inOut', onUpdate: drawCount })
    .to('.preloader__inner', { y: -30, opacity: 0, duration: 0.5, ease: 'power2.in' })
    .to('.preloader', { yPercent: -100, duration: 1.1, ease: 'expo.inOut' })
    .add(() => {
      $('.preloader').remove();
      document.body.classList.remove('is-loading');
      lenis.start();
      ScrollTrigger.refresh();
    })
    .to('.nav', { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' }, '-=0.5')
    .to(heroLines, { yPercent: 0, rotate: 0, duration: 1.3, ease: 'expo.out', stagger: 0.12 }, '-=0.7')
    .to('.hero__anim', { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.1 }, '-=1.1')
    .to('.floater, .bubble', { scale: 1, opacity: 1, duration: 1.2, ease: 'elastic.out(1, 0.6)', stagger: 0.05 }, '-=1');
});
