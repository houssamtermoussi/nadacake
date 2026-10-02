import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const physical = (color, opts = {}) =>
  new THREE.MeshPhysicalMaterial({ color, roughness: 0.6, ...opts });

function shadowed(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function speckleTexture(base, dots, count = 2600, size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  const rnd = seeded(7);
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = dots[Math.floor(rnd() * dots.length)];
    ctx.globalAlpha = 0.35 + rnd() * 0.5;
    ctx.beginPath();
    ctx.arc(rnd() * size, rnd() * size, 0.8 + rnd() * 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Piped cream "star tip" rosette built from a twisted lathe profile. */
function rosetteGeometry(radius = 0.15, height = 0.28, ridges = 8) {
  const pts = [
    [0, 0],
    [radius * 0.92, 0.0],
    [radius, height * 0.18],
    [radius * 0.82, height * 0.45],
    [radius * 0.48, height * 0.72],
    [radius * 0.16, height * 0.93],
    [0, height],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const geo = new THREE.LatheGeometry(pts, 64);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const theta = Math.atan2(v.z, v.x);
    const k = 1 + 0.16 * Math.sin(ridges * theta + (v.y / height) * 5.5);
    pos.setXYZ(i, v.x * k, v.y, v.z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

function walnutGeometry(size = 0.12) {
  const geo = new THREE.IcosahedronGeometry(size, 4);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n =
      Math.sin(v.x * 70) * Math.cos(v.z * 60) * 0.12 +
      Math.sin(v.y * 90 + v.x * 40) * 0.06 +
      (Math.abs(v.x) < size * 0.08 ? -0.25 : 0);
    v.multiplyScalar(1 + n);
    pos.setXYZ(i, v.x * 1.25, v.y * 0.62, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function goldMaterial() {
  return physical(0xe2b866, { metalness: 1, roughness: 0.28 });
}

function scatterInstanced(geometry, material, count, place) {
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const r = place(i, p, e, s, c);
    q.setFromEuler(e);
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
    if (r?.color) mesh.setColorAt(i, c);
  }
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/* ------------------------------------------------------------------ */
/*  Rose Nada : le gâteau du logo — génoise, glaçage rose coulant,      */
/*  rosettes de crème et cerise.                                        */
/* ------------------------------------------------------------------ */
export function createPinkCake() {
  const group = new THREE.Group();
  const rnd = seeded(42);

  const board = shadowed(
    new THREE.Mesh(new THREE.CylinderGeometry(1.72, 1.72, 0.06, 96), goldMaterial()),
  );
  board.position.y = 0.03;
  group.add(board);

  const sponge = physical(0xf1c99b, { roughness: 0.85, map: speckleTexture('#f1c99b', ['#d9a56f', '#fbe3c4']) });
  const cream = physical(0xfff6ef, { roughness: 0.45, sheen: 0.6, sheenColor: 0xffffff });
  const pink = physical(0xf27aa6, { roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.15 });

  let y = 0.06;
  const layer = (h, r, material) => {
    const mesh = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 96), material));
    mesh.position.y = y + h / 2;
    y += h;
    group.add(mesh);
    return mesh;
  };
  layer(0.52, 1.2, sponge);
  layer(0.1, 1.205, cream);
  layer(0.48, 1.2, sponge);

  const topY = y + 0.18;
  const glaze = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(1.24, 1.24, 0.2, 96), pink));
  glaze.position.y = y + 0.1;
  group.add(glaze);

  const drips = 34;
  for (let i = 0; i < drips; i++) {
    const a = (i / drips) * Math.PI * 2 + rnd() * 0.08;
    const len = 0.12 + rnd() * 0.55;
    const r = 0.065 + rnd() * 0.035;
    const drip = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), pink));
    drip.position.set(Math.cos(a) * 1.215, topY - 0.08 - len / 2, Math.sin(a) * 1.215);
    group.add(drip);
  }

  const rosette = rosetteGeometry(0.15, 0.3, 8);
  const ring = 14;
  for (let i = 0; i < ring; i++) {
    const a = (i / ring) * Math.PI * 2;
    const m = shadowed(new THREE.Mesh(rosette, cream));
    m.position.set(Math.cos(a) * 0.98, topY, Math.sin(a) * 0.98);
    m.rotation.y = rnd() * Math.PI;
    group.add(m);
  }

  const sprinkleColors = [0xffffff, 0xffd166, 0xff8fb8, 0x9be7ff, 0xd81b3c];
  group.add(
    scatterInstanced(
      new THREE.CapsuleGeometry(0.018, 0.07, 4, 8),
      physical(0xffffff, { roughness: 0.35, clearcoat: 0.6 }),
      90,
      (i, p, e, s, c) => {
        const a = rnd() * Math.PI * 2;
        const d = Math.sqrt(rnd()) * 0.72;
        p.set(Math.cos(a) * d, topY + 0.01, Math.sin(a) * d);
        e.set(Math.PI / 2, 0, rnd() * Math.PI * 2);
        s.setScalar(1);
        c.set(sprinkleColors[i % sprinkleColors.length]);
        return { color: true };
      },
    ),
  );

  const cherry = shadowed(
    new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 48, 32),
      physical(0xd4143a, { roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }),
    ),
  );
  cherry.position.set(0, topY + 0.19, 0);
  cherry.scale.set(1, 0.92, 1);
  group.add(cherry);

  const stem = shadowed(
    new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, topY + 0.34, 0),
          new THREE.Vector3(0.05, topY + 0.5, 0.02),
          new THREE.Vector3(0.16, topY + 0.62, 0.04),
        ]),
        16,
        0.014,
        8,
      ),
      physical(0x6b8e23, { roughness: 0.6 }),
    ),
  );
  group.add(stem);

  group.userData.height = topY + 0.6;
  return group;
}

/* ------------------------------------------------------------------ */
/*  Chocolat Miroir : glaçage brillant et copeaux de chocolat.          */
/* ------------------------------------------------------------------ */
export function createChocolateCake() {
  const group = new THREE.Group();
  const rnd = seeded(11);

  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(1.78, 1.7, 0.05, 128),
    physical(0xffffff, {
      roughness: 0.04,
      transmission: 1,
      thickness: 0.15,
      ior: 1.5,
      transparent: true,
      opacity: 0.9,
    }),
  );
  plate.position.y = 0.025;
  plate.receiveShadow = true;
  group.add(plate);

  const h = 0.62;
  const R = 1.3;
  const bevel = 0.12;
  const profile = [new THREE.Vector2(0, 0), new THREE.Vector2(R - 0.02, 0), new THREE.Vector2(R, 0.03)];
  profile.push(new THREE.Vector2(R, h - bevel));
  for (let i = 1; i <= 8; i++) {
    const t = (i / 8) * (Math.PI / 2);
    profile.push(new THREE.Vector2(R - bevel + Math.cos(t) * bevel, h - bevel + Math.sin(t) * bevel));
  }
  profile.push(new THREE.Vector2(0, h));
  const body = shadowed(
    new THREE.Mesh(
      new THREE.LatheGeometry(profile, 128),
      physical(0x3a1c10, { roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.03, sheen: 0.3 }),
    ),
  );
  body.position.y = 0.05;
  group.add(body);

  const topY = 0.05 + h;
  const shavingColors = [0x5b3320, 0x7a4a2c, 0x2e160b, 0x8d5a36];
  group.add(
    scatterInstanced(
      new THREE.BoxGeometry(0.09, 0.035, 0.07),
      physical(0xffffff, { roughness: 0.55 }),
      240,
      (i, p, e, s, c) => {
        const a = rnd() * Math.PI * 2;
        const d = 0.86 + rnd() * 0.38;
        p.set(Math.cos(a) * d, topY + 0.02 + rnd() * 0.05, Math.sin(a) * d);
        e.set(rnd() * 1.2, rnd() * Math.PI, rnd() * 1.2);
        s.set(0.6 + rnd() * 0.9, 0.7 + rnd() * 0.6, 0.6 + rnd() * 0.9);
        c.set(shavingColors[i % shavingColors.length]);
        return { color: true };
      },
    ),
  );

  group.add(
    scatterInstanced(
      new THREE.SphereGeometry(0.045, 12, 8),
      physical(0xe0618f, { roughness: 0.5, sheen: 1, sheenColor: 0xffb3cf }),
      26,
      (i, p, e, s) => {
        const a = rnd() * Math.PI * 2;
        const d = 0.9 + rnd() * 0.3;
        p.set(Math.cos(a) * d, topY + 0.07, Math.sin(a) * d);
        e.set(rnd(), rnd() * Math.PI, rnd());
        s.set(1, 0.25, 0.7);
      },
    ),
  );

  group.userData.height = topY + 0.2;
  return group;
}

/* ------------------------------------------------------------------ */
/*  Bûche aux Noix : biscuit aux noix, rosettes de crème, noix et       */
/*  pétales de rose sur plateau doré.                                    */
/* ------------------------------------------------------------------ */
export function createWalnutLog() {
  const group = new THREE.Group();
  const rnd = seeded(5);

  const board = shadowed(new THREE.Mesh(new RoundedBoxGeometry(3.7, 0.05, 1.45, 2, 0.02), goldMaterial()));
  board.position.y = 0.025;
  group.add(board);

  const crumbTex = speckleTexture('#d4ac7c', ['#a0703f', '#7a5029', '#f1dcbc', '#bf9160', '#5e3a1c'], 7000);
  crumbTex.repeat.set(2, 1);
  const body = shadowed(
    new THREE.Mesh(
      new RoundedBoxGeometry(3.0, 0.72, 0.88, 5, 0.14),
      physical(0xf2dcc0, { roughness: 0.95, map: crumbTex }),
    ),
  );
  body.position.y = 0.05 + 0.36;
  group.add(body);

  const topY = 0.05 + 0.72;
  const cream = physical(0xfffaf0, { roughness: 0.45, sheen: 0.6, sheenColor: 0xffffff });
  const rosette = rosetteGeometry(0.15, 0.24, 8);
  const smallRosette = rosetteGeometry(0.085, 0.13, 7);

  for (let i = 0; i < 11; i++) {
    const x = -1.3 + i * 0.26;
    for (const z of [-0.2, 0.2]) {
      const m = shadowed(new THREE.Mesh(rosette, cream));
      m.position.set(x + (z > 0 ? 0.13 : 0), topY - 0.03, z);
      m.rotation.y = rnd() * Math.PI;
      group.add(m);
    }
  }

  for (let i = 0; i < 17; i++) {
    const x = -1.52 + i * 0.19;
    for (const z of [-0.56, 0.56]) {
      const m = shadowed(new THREE.Mesh(smallRosette, cream));
      m.position.set(x, 0.05, z);
      group.add(m);
    }
  }
  for (const x of [-1.62, 1.62]) {
    for (let j = 0; j < 5; j++) {
      const m = shadowed(new THREE.Mesh(smallRosette, cream));
      m.position.set(x, 0.05, -0.4 + j * 0.2);
      group.add(m);
    }
  }

  const walnut = walnutGeometry(0.14);
  const walnutMat = physical(0x9c5a22, { roughness: 0.55, clearcoat: 0.3 });
  for (let i = 0; i < 10; i++) {
    const m = shadowed(new THREE.Mesh(walnut, walnutMat));
    m.position.set(-1.17 + i * 0.26, topY + 0.16, (i % 2 ? 1 : -1) * 0.02);
    m.rotation.set(rnd() * 0.4, rnd() * Math.PI, rnd() * 0.4);
    group.add(m);
  }

  group.add(
    scatterInstanced(
      new THREE.SphereGeometry(0.05, 12, 8),
      physical(0xd9668f, { roughness: 0.5, sheen: 1, sheenColor: 0xffc2d6 }),
      12,
      (i, p, e, s) => {
        p.set(-1.05 + i * 0.2, topY + 0.16, (i % 2 ? -1 : 1) * 0.3);
        e.set(rnd(), rnd() * Math.PI, rnd());
        s.set(1, 0.22, 0.75);
      },
    ),
  );

  group.userData.height = topY + 0.4;
  return group;
}

export const CAKES = {
  rose: createPinkCake,
  chocolat: createChocolateCake,
  noix: createWalnutLog,
};
