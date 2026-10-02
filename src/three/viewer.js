import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import gsap from 'gsap';
import { CAKES } from './cakes.js';

const FIT = { rose: 1, chocolat: 1.05, noix: 0.82 };

function sparkleTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,214,231,0.9)');
  g.addColorStop(1, 'rgba(255,182,213,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSparkles(count = 140) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 1.9 + Math.random() * 2.2;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = Math.random() * 3.6;
    positions[i * 3 + 2] = Math.sin(a) * r;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      size: 0.11,
      map: sparkleTexture(),
      transparent: true,
      depthWrite: false,
      color: 0xffc8dc,
      opacity: 0.95,
    }),
  );
}

/**
 * Mounts an interactive 360° cake viewer inside `container`.
 */
export function createViewer(
  container,
  { cake = 'rose', pedestal = false, float = true, autoRotateSpeed = 1.6, onInteract } = {},
) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.85;

  scene.add(new THREE.HemisphereLight(0xfff0f5, 0xf7b6cf, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 7, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -3.5, right: 3.5, top: 3.5, bottom: -3.5, near: 1, far: 20 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xff8fb8, 1.8);
  rim.position.set(-4, 3, -4);
  scene.add(rim);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 2.9, 6.9);

  const stage = new THREE.Group();
  const holder = new THREE.Group();
  stage.add(holder);
  scene.add(stage);

  const groundY = pedestal ? -0.36 : 0;
  if (pedestal) {
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(2.25, 2.35, 0.36, 128),
      new THREE.MeshPhysicalMaterial({ color: 0xfde3ec, roughness: 0.3, clearcoat: 0.6 }),
    );
    base.position.y = -0.18;
    base.receiveShadow = true;
    base.castShadow = true;
    stage.add(base);
    const trim = new THREE.Mesh(
      new THREE.TorusGeometry(2.25, 0.025, 12, 160),
      new THREE.MeshPhysicalMaterial({ color: 0xe2b866, metalness: 1, roughness: 0.25 }),
    );
    trim.rotation.x = Math.PI / 2;
    stage.add(trim);
  }

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.ShadowMaterial({ color: 0x8a2f55, opacity: 0.16 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = groundY;
  ground.receiveShadow = true;
  scene.add(ground);

  const sparkles = createSparkles();
  sparkles.position.y = groundY;
  scene.add(sparkles);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.75, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = 1.42;
  controls.autoRotate = true;
  controls.autoRotateSpeed = autoRotateSpeed;
  renderer.domElement.style.touchAction = 'pan-y';
  if (onInteract) controls.addEventListener('start', onInteract);

  const cache = new Map();
  let current = null;
  let currentName = null;

  function setCake(name) {
    if (name === currentName || !CAKES[name]) return;
    currentName = name;
    if (!cache.has(name)) cache.set(name, CAKES[name]());
    const next = cache.get(name);
    const old = current;
    const s = FIT[name] ?? 1;
    current = next;

    gsap.killTweensOf([next.scale, next.rotation]);
    next.scale.setScalar(0.001);
    next.rotation.y = -Math.PI;
    holder.add(next);

    if (old) {
      gsap.killTweensOf([old.scale, old.rotation]);
      gsap.to(old.rotation, { y: old.rotation.y + Math.PI, duration: 0.5, ease: 'power2.in' });
      gsap.to(old.scale, {
        x: 0.001,
        y: 0.001,
        z: 0.001,
        duration: 0.5,
        ease: 'back.in(1.6)',
        onComplete: () => old !== current && holder.remove(old),
      });
    }
    const delay = old ? 0.35 : 0;
    gsap.to(next.scale, { x: s, y: s, z: s, duration: 1.1, delay, ease: 'elastic.out(1, 0.55)' });
    gsap.to(next.rotation, { y: 0, duration: 1.3, delay, ease: 'power3.out' });
  }

  function resize() {
    const { clientWidth: w, clientHeight: h } = container;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.zoom = Math.min(1, camera.aspect * 1.05);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  let visible = true;
  new IntersectionObserver(([entry]) => (visible = entry.isIntersecting), { rootMargin: '120px' }).observe(container);

  const start = performance.now();
  renderer.setAnimationLoop(() => {
    if (!visible) return;
    const t = (performance.now() - start) / 1000;
    controls.update();
    if (float) holder.position.y = Math.sin(t * 1.3) * 0.05;
    sparkles.rotation.y = t * 0.06;
    sparkles.position.y = groundY + Math.sin(t * 0.7) * 0.08;
    renderer.render(scene, camera);
  });

  setCake(cake);

  return {
    setCake,
    stage,
    controls,
    setAutoRotate(on) {
      controls.autoRotate = on;
    },
  };
}
