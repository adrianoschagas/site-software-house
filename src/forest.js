// Mata 3D do topo: relevo, rio, árvores instanciadas, araras, nuvens e o helicóptero que segue o cursor.
import * as THREE from 'three';

const PI = Math.PI;
const C = (hex) => new THREE.Color(hex);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const mix = (a, b, k) => a + (b - a) * k;
const std = (hex, rough = 0.8) => new THREE.MeshStandardMaterial({ color: hex, flatShading: true, roughness: rough, metalness: 0.02 });

// relevo: morros, serra ao fundo e um rio que serpenteia
const riverX = (z) => 14 * Math.sin(z * 0.07 + 0.6) + 6 * Math.sin(z * 0.19) + 12;
const riverD = (x, z) => Math.abs(x - riverX(z));
function ground(x, z) {
  let h = 2.2 + 2.0 * Math.sin(x * 0.06 + 1.3) * Math.cos(z * 0.08) + 1.2 * Math.sin(x * 0.14 + z * 0.11 + 2) + 0.5 * Math.sin(x * 0.31 - z * 0.27);
  if (z < -22) h += Math.pow((-22 - z) / 38, 1.6) * 20 * (0.7 + 0.3 * Math.sin(x * 0.09));
  const d = riverD(x, z);
  if (d < 7) { let k = 1 - d / 7; k *= k; h = h * (1 - k) - 1.7 * k; }
  return h;
}

// luz de dia e de noite; a troca é interpolada quadro a quadro
const DAY = { fog: C(0xB9F2DC), sky: C(0xD8F3FF), gnd: C(0x2E7A46), hemi: 0.85 * PI, sun: C(0xFFF0C2), sunI: 1.25 * PI, water: C(0x10B4E6), cloud: C(0xFFFFFF) };
const NIGHT = { fog: C(0x16304E), sky: C(0x6E8CE8), gnd: C(0x0A3A2C), hemi: 0.62 * PI, sun: C(0xA9C1FF), sunI: 0.5 * PI, water: C(0x0C4A8C), cloud: C(0x566CA3) };

export function initForest(hero, canvas, countEl) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) {
    hero.classList.add('no3d');
    return null;
  }
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(DAY.fog.clone(), 62, 140);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 320);
  const look = new THREE.Vector3(0, 7, -10);

  const hemi = new THREE.HemisphereLight(DAY.sky.clone(), DAY.gnd.clone(), DAY.hemi);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(DAY.sun.clone(), DAY.sunI);
  sun.position.set(38, 56, 24);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -95, right: 95, top: 62, bottom: -62, near: 1, far: 190 });
  sun.shadow.bias = -0.0006;
  scene.add(sun);

  // terreno com cor por vértice
  const tg = new THREE.PlaneGeometry(290, 106, 166, 62);
  tg.rotateX(-PI / 2); tg.translate(0, 0, -15);
  {
    const p = tg.attributes.position, cols = new Float32Array(p.count * 3);
    const g1 = C(0x14A84B), g2 = C(0x3CCB5A), g3 = C(0x0B7F63), sand = C(0xF5DC8C), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), h = ground(x, z);
      p.setY(i, h);
      const n = 0.5 + 0.5 * Math.sin(x * 0.9 + z * 1.3) * Math.sin(x * 0.37 - z * 0.51);
      c.copy(g1).lerp(g2, n);
      if (h > 8) c.lerp(g3, clamp((h - 8) / 9, 0, 1));
      if (h < 0.35) c.lerp(sand, clamp((0.35 - h) / 0.7, 0, 1));
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    }
    tg.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    tg.computeVertexNormals();
  }
  const terrain = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0 }));
  terrain.receiveShadow = true;
  scene.add(terrain);

  const wg = new THREE.PlaneGeometry(290, 106); wg.rotateX(-PI / 2); wg.translate(0, -0.75, -15);
  const water = new THREE.Mesh(wg, new THREE.MeshStandardMaterial({ color: DAY.water.clone(), roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.92 }));
  water.receiveShadow = true;
  scene.add(water);

  // árvores instanciadas: copa larga (com ipês floridos), palmeira e araucária
  const trunkMat = std(0x7A4A21, 1);
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 0.85, metalness: 0 });
  const white = new THREE.Color(1, 1, 1);
  function mkType(trunkGeo, canopyGeo, cap) {
    const tm = new THREE.InstancedMesh(trunkGeo, trunkMat, cap), cm = new THREE.InstancedMesh(canopyGeo, canopyMat, cap);
    cm.setColorAt(0, white);                      // aloca as cores para a capacidade inteira
    tm.count = 0; cm.count = 0;
    tm.castShadow = cm.castShadow = true; cm.receiveShadow = true;
    tm.frustumCulled = cm.frustumCulled = false;
    scene.add(tm, cm);
    return { tm, cm, n: 0, cap };
  }
  const TYPES = {
    leaf: mkType(new THREE.CylinderGeometry(0.16, 0.26, 1.7, 5).translate(0, 0.85, 0),
                 new THREE.IcosahedronGeometry(1.3, 0).scale(1, 0.9, 1).translate(0, 2.45, 0), 800),
    palm: mkType(new THREE.CylinderGeometry(0.09, 0.15, 3.5, 5).translate(0, 1.75, 0),
                 new THREE.ConeGeometry(1.55, 0.75, 7).translate(0, 3.7, 0), 220),
    arau: mkType(new THREE.CylinderGeometry(0.12, 0.2, 3.8, 5).translate(0, 1.9, 0),
                 new THREE.CylinderGeometry(1.6, 0.45, 0.75, 7).translate(0, 4.0, 0), 240),
  };
  const GREENS = [C(0x0E9F45), C(0x18B552), C(0x0B7D3A), C(0x4CC944), C(0x7ED957)];
  const IPES = [C(0xFFD400), C(0xFFD400), C(0xFF3D8B), C(0xA24BFF), C(0xFFFFFF)];
  const PALMS = [C(0x35C24A), C(0x8BE04A)], ARAUS = [C(0x0A6B3F), C(0x0E7F4C)];
  const trees = [];
  function addTree(type, x, z, s, color, born) {
    const T = TYPES[type]; if (T.n >= T.cap) return false;
    const i = T.n++; T.tm.count = T.n; T.cm.count = T.n;
    T.cm.setColorAt(i, color); T.cm.instanceColor.needsUpdate = true;
    trees.push({ T, i, x, y: ground(x, z) - 0.12, z, s, ry: Math.random() * 6.28, ph: Math.random() * 6.28, born });
    return true;
  }
  for (let n = 0; n < 1500 && trees.length < 860; n++) {
    const x = rnd(-130, 130), z = rnd(-58, 32), d = riverD(x, z);
    if (d < 7.8 || ground(x, z) < 0.3) continue;
    const r = Math.random();
    if (d < 15 && r < 0.45) addTree('palm', x, z, rnd(0.8, 1.3), pick(PALMS), -1);
    else if (z < -14 && r < 0.3) addTree('arau', x, z, rnd(0.9, 1.5), pick(ARAUS), -1);
    else addTree('leaf', x, z, rnd(0.75, 1.5), Math.random() < 0.13 ? pick(IPES) : pick(GREENS), -1);
  }
  const dummy = new THREE.Object3D(); dummy.rotation.order = 'XZY';
  const backOut = (u) => { const v = u - 1; return 1 + 2.70158 * v * v * v + 1.70158 * v * v; };
  function updateTrees(t, hx, hz) {
    for (const o of trees) {
      const g = o.born < 0 ? 1 : backOut(clamp((t - o.born) / 0.9, 0, 1));
      const dx = o.x - hx, dz = o.z - hz, dist = Math.sqrt(dx * dx + dz * dz) + 0.001;
      const w = dist < 9 ? Math.pow(1 - dist / 9, 2) * 0.42 : 0;          // vento do rotor
      const fl = w ? Math.sin(t * 15 + o.ph) * w * 0.3 : 0;
      dummy.position.set(o.x, o.y, o.z);
      dummy.rotation.set(w * dz / dist + fl, o.ry, -w * dx / dist + Math.sin(t * 1.2 + o.ph) * 0.03 + fl);
      dummy.scale.setScalar(Math.max(0.001, o.s * g));
      dummy.updateMatrix();
      o.T.tm.setMatrixAt(o.i, dummy.matrix); o.T.cm.setMatrixAt(o.i, dummy.matrix);
    }
    for (const k in TYPES) { TYPES[k].tm.instanceMatrix.needsUpdate = true; TYPES[k].cm.instanceMatrix.needsUpdate = true; }
  }

  // helicóptero nas cores da bandeira, com farol para a noite
  const heli = new THREE.Group(), tiltG = new THREE.Group(), rotor = new THREE.Group();
  const glow = (hex) => new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(2.4, 7, 24, 1, true).translate(0, -3.5, 0), glow(0xFFF2B0));
  const pool = new THREE.Mesh(new THREE.CircleGeometry(5, 28).rotateX(-PI / 2), glow(0xFFF2B0));
  let tailRotor;
  {
    const mY = std(0xFFD400, 0.5), mG = std(0x00A24A, 0.6), mB = std(0x1A49E8, 0.2), mK = std(0x0A2A1C, 0.7);
    const add = (geo, mat, x, y, z, parent = tiltG) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
    add(new THREE.SphereGeometry(1, 10, 8), mY, 0, 0, 0).scale.set(1.55, 1, 1.05);
    add(new THREE.SphereGeometry(0.8, 10, 8), mB, 0.72, 0.16, 0).scale.set(1.1, 0.93, 1.02);
    add(new THREE.CylinderGeometry(0.1, 0.3, 2.8, 6), mG, -2.5, 0.25, 0).rotation.z = PI / 2;
    add(new THREE.BoxGeometry(0.6, 1.05, 0.1), mG, -3.75, 0.7, 0).rotation.z = 0.35;
    tailRotor = add(new THREE.BoxGeometry(0.12, 1.35, 0.06), mK, -3.8, 0.75, 0.16);
    add(new THREE.CylinderGeometry(0.08, 0.08, 0.5, 6), mK, 0, 1.15, 0);
    rotor.position.y = 1.42; tiltG.add(rotor);
    add(new THREE.BoxGeometry(5.8, 0.05, 0.28), mK, 0, 0, 0, rotor);
    add(new THREE.BoxGeometry(0.28, 0.05, 5.8), mK, 0, 0, 0, rotor);
    rotor.add(new THREE.Mesh(new THREE.CircleGeometry(2.9, 28).rotateX(-PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x0A2A1C, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false })));
    for (const z of [-0.62, 0.62]) {
      add(new THREE.BoxGeometry(2.4, 0.07, 0.09), mK, 0.1, -1.15, z);
      add(new THREE.BoxGeometry(0.07, 0.5, 0.07), mK, 0.7, -0.9, z);
      add(new THREE.BoxGeometry(0.07, 0.5, 0.07), mK, -0.5, -0.9, z);
    }
    beam.position.set(1.3, -0.5, 0); beam.rotation.z = 0.6; tiltG.add(beam);
    heli.add(tiltG); heli.scale.setScalar(1.9); heli.position.set(12, 12, -4);
    scene.add(heli, pool);
  }

  // araras e saíras
  const birds = [];
  {
    const combos = [[0xE5322B, 0x1A49E8], [0x1A49E8, 0xFFD400], [0x00BFC8, 0x9BE22D], [0x12A84C, 0xE5322B], [0xFF7A00, 0x0A2A1C]];
    const bodyGeo = new THREE.ConeGeometry(0.17, 0.8, 5).rotateZ(-PI / 2);
    const wingGeo = new THREE.PlaneGeometry(0.42, 0.95).rotateX(-PI / 2).translate(0, 0, 0.475);
    for (let i = 0; i < 18; i++) {
      const cb = combos[i % combos.length], g = new THREE.Group();
      const wm = new THREE.MeshStandardMaterial({ color: cb[1], flatShading: true, roughness: 0.8, side: THREE.DoubleSide });
      g.add(new THREE.Mesh(bodyGeo, std(cb[0], 0.7)));
      const wr = new THREE.Mesh(wingGeo, wm), wl = new THREE.Mesh(wingGeo, wm); wl.scale.z = -1;
      g.add(wr, wl); g.scale.setScalar(1.7); scene.add(g);
      birds.push({ g, wr, wl, cx: rnd(-34, 36), cz: rnd(-26, 12), rx: rnd(7, 20), rz: rnd(5, 13),
                   w: rnd(0.18, 0.42) * (i % 2 ? 1 : -1), ph: rnd(0, 6.28), a: rnd(6.5, 13), ox: 0, oy: 0, oz: 0 });
    }
  }

  // nuvens
  const clouds = [];
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 1, fog: false });
  {
    const geo = new THREE.IcosahedronGeometry(1, 0);
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group();
      for (const p of [[0, 0, 0, 2.6], [2.4, -0.3, 0.3, 1.9], [-2.3, -0.4, -0.2, 1.7], [0.8, 0.9, -0.4, 1.6]]) {
        const m = new THREE.Mesh(geo, cloudMat); m.position.set(p[0], p[1], p[2]); m.scale.set(p[3], p[3] * 0.62, p[3]); g.add(m);
      }
      g.position.set(rnd(-70, 70), rnd(24, 31), rnd(-52, -18)); g.userData.v = rnd(0.5, 1.2);
      scene.add(g); clouds.push(g);
    }
  }

  // vaga-lumes: três grupos piscando fora de fase, só à noite
  const flies = [];
  for (let k = 0; k < 3; k++) {
    const pos = new Float32Array(60 * 3);
    for (let i = 0; i < 60; i++) {
      const x = rnd(-56, 56), z = rnd(-30, 26);
      pos[i * 3] = x; pos[i * 3 + 1] = Math.max(0, ground(x, z)) + rnd(1.2, 6); pos[i * 3 + 2] = z;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xE9FF70, size: 0.6, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    pts.userData = { w: 1.3 + k * 0.7, p: k * 2.1 }; pts.frustumCulled = false;
    scene.add(pts); flies.push(pts);
  }

  // ponteiro
  const ndc = new THREE.Vector2(0.3, 0), ray = new THREE.Raycaster();
  const flight = new THREE.Plane(new THREE.Vector3(0, 1, 0), -11), hit = new THREE.Vector3();
  const target = new THREE.Vector3(12, 0, -4), vel = new THREE.Vector3(), par = new THREE.Vector2(), cursor = new THREE.Vector3();
  const KEEP = 13;                       // distância lateral que o helicóptero mantém do cursor
  let side = 1, active = false, idle = null, yaw = 0, planted = 0, clock = 0, nightT = 0, nightK = 0;
  function setNdc(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }
  function aim(e) {
    setNdc(e); active = true; clearTimeout(idle);
    if (e.pointerType !== 'mouse') idle = setTimeout(() => { active = false; }, 3500);
  }
  hero.addEventListener('pointermove', aim);
  hero.addEventListener('pointerdown', aim);
  hero.addEventListener('pointerleave', () => { active = false; });

  canvas.addEventListener('click', (e) => {
    setNdc(e); ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObject(terrain);
    if (!hits.length) return;
    const p = hits[0].point;
    if (riverD(p.x, p.z) < 7.6 || ground(p.x, p.z) < 0.3) return;          // no rio não nasce ipê
    if (addTree('leaf', p.x, p.z, rnd(1.15, 1.7), pick(IPES), clock)) { planted++; if (countEl) countEl.textContent = planted; }
    if (reduce) { trees[trees.length - 1].born = -1; renderOnce(); }
  });

  function resize() {
    const w = hero.clientWidth, h = hero.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    if (w < 700) { camera.fov = 50; camera.setViewOffset(w, h, 0, -h * 0.2, w, h); }        // cena desce: o texto fica no céu
    else { camera.fov = 38; camera.setViewOffset(w, h, -w * 0.13, -h * 0.03, w, h); }     // cena vai pra direita do texto
    camera.updateProjectionMatrix();
    if (reduce) renderOnce();
  }

  function applyNight(k, t) {
    scene.fog.color.lerpColors(DAY.fog, NIGHT.fog, k);
    hemi.color.lerpColors(DAY.sky, NIGHT.sky, k); hemi.groundColor.lerpColors(DAY.gnd, NIGHT.gnd, k);
    hemi.intensity = mix(DAY.hemi, NIGHT.hemi, k);
    sun.color.lerpColors(DAY.sun, NIGHT.sun, k); sun.intensity = mix(DAY.sunI, NIGHT.sunI, k);
    water.material.color.lerpColors(DAY.water, NIGHT.water, k);
    cloudMat.color.lerpColors(DAY.cloud, NIGHT.cloud, k);
    beam.material.opacity = k * 0.2; pool.material.opacity = k * 0.2;
    beam.visible = pool.visible = k > 0.01;
    for (const f of flies) {
      f.visible = k > 0.01;
      f.material.opacity = k * (0.5 + 0.5 * Math.sin(t * f.userData.w + f.userData.p));
      f.position.y = Math.sin(t * 0.6 + f.userData.p) * 0.5;
    }
  }

  function step(t, dt) {
    // alvo: cursor projetado na altura de voo, ou um passeio sozinho
    const hp = heli.position;
    let watching = false;
    if (active) {
      ray.setFromCamera(ndc, camera);
      if (ray.ray.intersectPlane(flight, hit)) {
        // acompanha de lado, a uma distância fixa: nunca fica em cima do cursor
        const cx = clamp(hit.x, -62, 62), cz = clamp(hit.z, -36, 24);
        if (Math.abs(cx + side * KEEP) > 62) side = -side;
        else if (Math.abs(hp.x - cx) > KEEP * 0.4) side = hp.x > cx ? 1 : -1;
        target.set(cx + side * KEEP, 0, clamp(cz - 4, -36, 24));
        cursor.set(cx, 0, cz); watching = true;
      }
    } else target.set(10 + 22 * Math.sin(t * 0.22), 0, -7 + 11 * Math.sin(t * 0.44));

    vel.x += ((target.x - hp.x) * 3.6 - vel.x * 3.4) * dt;
    vel.z += ((target.z - hp.z) * 3.6 - vel.z * 3.4) * dt;
    hp.x += vel.x * dt; hp.z += vel.z * dt;
    const gh = Math.max(0, ground(hp.x, hp.z));
    hp.y = 11 + gh * 0.55 + Math.sin(t * 2) * 0.25;
    const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
    let turn = 0;
    if (speed > 1.6 || watching) {
      // voando, aponta pra onde vai; parado ao lado do cursor, vira o nariz pra ele
      const want = speed > 1.6 ? Math.atan2(-vel.z, vel.x) : Math.atan2(-(cursor.z - hp.z), cursor.x - hp.x);
      turn = Math.atan2(Math.sin(want - yaw), Math.cos(want - yaw));
      yaw += turn * (1 - Math.exp(-6 * dt));
    }
    heli.rotation.y = yaw;
    tiltG.rotation.z += (-clamp(speed * 0.03, 0, 0.42) - tiltG.rotation.z) * Math.min(1, dt * 6);
    tiltG.rotation.x += (clamp(-turn * 0.5, -0.5, 0.5) - tiltG.rotation.x) * Math.min(1, dt * 5);
    rotor.rotation.y += dt * 30; tailRotor.rotation.z += dt * 36;

    // mancha de luz do farol no chão, à frente do helicóptero
    const reach = (hp.y - gh) * 0.7 + 2.5, px = hp.x + Math.cos(yaw) * reach, pz = hp.z - Math.sin(yaw) * reach;
    pool.position.set(px, Math.max(-0.6, ground(px, pz)) + 0.3, pz);

    updateTrees(t, hp.x, hp.z);

    for (const b of birds) {
      const a = b.w * t + b.ph;
      const bx = b.cx + b.rx * Math.cos(a), bz = b.cz + b.rz * Math.sin(a), by = b.a + Math.sin(t * 0.8 + b.ph) * 0.7;
      const ddx = bx + b.ox - hp.x, ddz = bz + b.oz - hp.z, dd = Math.sqrt(ddx * ddx + ddz * ddz) + 0.001;
      if (dd < 8) { const f = (1 - dd / 8) * 26 * dt; b.ox += ddx / dd * f; b.oz += ddz / dd * f; b.oy += f * 0.35; }   // espanta
      const decay = Math.exp(-0.9 * dt); b.ox *= decay; b.oy *= decay; b.oz *= decay;
      b.g.position.set(bx + b.ox, by + b.oy, bz + b.oz);
      b.g.rotation.y = Math.atan2(-b.rz * b.w * Math.cos(a), -b.rx * b.w * Math.sin(a));
      const flap = Math.sin(t * 11 + b.ph) * 0.75;
      b.wr.rotation.x = -flap; b.wl.rotation.x = flap;
    }
    for (const cl of clouds) { cl.position.x += cl.userData.v * dt; if (cl.position.x > 84) cl.position.x = -84; }

    nightK += (nightT - nightK) * Math.min(1, dt * 3);
    applyNight(nightK, t);

    par.x += ((active ? ndc.x : 0) - par.x) * Math.min(1, dt * 2);
    par.y += ((active ? ndc.y : 0) - par.y) * Math.min(1, dt * 2);
    camera.position.set(par.x * 3.5, 19 - par.y * 1.2, 52);
    camera.lookAt(look);
  }
  function renderOnce() { step(clock, 0); renderer.render(scene, camera); }

  let visible = true, last = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    if (!visible || document.hidden) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt;
    step(clock, dt);
    renderer.render(scene, camera);
  }
  resize();
  window.addEventListener('resize', resize);
  renderOnce();
  if (!reduce) {
    if ('IntersectionObserver' in window) new IntersectionObserver((en) => { visible = en[0].isIntersecting; }).observe(hero);
    requestAnimationFrame((now) => { last = now; loop(now); });
  }

  return {
    setNight(on) {
      nightT = on ? 1 : 0;
      if (reduce) { nightK = nightT; renderOnce(); }
    },
  };
}
