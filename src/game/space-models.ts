import * as THREE from "three";
import type { PlanetData } from "./planet-data";

export function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function createPlanetTexture(data: PlanetData, seed = 1): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const rng = mulberry32(seed * 991 + data.id.length * 37);
  const base = `#${data.color.toString(16).padStart(6, "0")}`;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (["jupiter", "saturn", "uranus", "neptune"].includes(data.id)) {
    const bands = data.id === "jupiter" ? ["#ead6b8", "#b98161", "#f4e0bd", "#986d5d"] :
      data.id === "saturn" ? ["#eadcae", "#c7b67f", "#f3e6bd"] :
      data.id === "uranus" ? ["#91e0df", "#65c4cf", "#a3e8e2"] : ["#2853b9", "#427fe2", "#21479d"];
    for (let y = 0; y < canvas.height; y += 8) {
      ctx.globalAlpha = 0.35 + rng() * 0.35;
      ctx.fillStyle = bands[Math.floor(rng() * bands.length)];
      const h = 4 + rng() * 14;
      ctx.fillRect(0, y + Math.sin(y * 0.08) * 3, canvas.width, h);
    }
    ctx.globalAlpha = 1;
    if (data.id === "jupiter") {
      ctx.fillStyle = "#a64e3e";
      ctx.beginPath();
      ctx.ellipse(355, 155, 52, 24, -0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#e7a57c";
      ctx.lineWidth = 7;
      ctx.stroke();
    }
  } else if (data.id === "earth") {
    ctx.fillStyle = "#2475bc";
    ctx.fillRect(0, 0, 512, 256);
    const lands = [[90, 80, 80, 45], [245, 65, 62, 80], [355, 145, 90, 45], [470, 62, 45, 32]];
    for (const [x, y, rx, ry] of lands) {
      ctx.fillStyle = rng() > 0.5 ? "#6da85f" : "#8fb768";
      ctx.beginPath();
      for (let i = 0; i <= 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        const wobble = 0.72 + rng() * 0.35;
        const px = x + Math.cos(a) * rx * wobble;
        const py = y + Math.sin(a) * ry * wobble;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(255,255,255,.55)";
    ctx.lineWidth = 7;
    for (let i = 0; i < 16; i++) {
      const y = rng() * 256;
      ctx.beginPath();
      ctx.moveTo(rng() * 420, y);
      ctx.bezierCurveTo(120 + rng() * 80, y - 20, 300 + rng() * 80, y + 22, 512, y - 4);
      ctx.stroke();
    }
  } else {
    for (let i = 0; i < 85; i++) {
      const x = rng() * 512;
      const y = rng() * 256;
      const r = 2 + rng() * 18;
      ctx.globalAlpha = 0.08 + rng() * 0.2;
      ctx.fillStyle = rng() > 0.48 ? "#fff1c9" : "#2d2430";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      if (data.id === "mercury" || data.id === "mars") {
        ctx.strokeStyle = "rgba(30,20,25,.28)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
  return canvasTexture(canvas);
}

export function createLabelSprite(text: string, accent = "#ffffff", small = false): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(7,15,37,.76)";
  ctx.beginPath();
  ctx.roundRect(10, 16, 492, 96, 42);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${small ? 48 : 54}px "Noto Sans SC", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 65);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(canvas), transparent: true, depthWrite: false }));
  sprite.scale.set(small ? 3.2 : 7.2, small ? 0.8 : 1.8, 1);
  return sprite;
}

export interface PlanetVisual {
  group: THREE.Group;
  mesh: THREE.Mesh;
  spin: number;
}

export function createPlanet(data: PlanetData): PlanetVisual {
  const group = new THREE.Group();
  group.name = `planet-${data.id}`;
  const geometry = new THREE.SphereGeometry(data.radius, 48, 32);
  const material = new THREE.MeshStandardMaterial({ map: createPlanetTexture(data, data.orbit), roughness: 0.86, metalness: 0.02 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.planetId = data.id;
  mesh.rotation.z = data.id === "uranus" ? Math.PI * 0.46 : 0.06;
  group.add(mesh);

  if (data.id === "saturn" || data.id === "uranus") {
    const ringGeo = new THREE.RingGeometry(data.radius * 1.35, data.radius * (data.id === "saturn" ? 2.15 : 1.75), 96, 4);
    const ringMat = new THREE.MeshBasicMaterial({
      color: data.id === "saturn" ? 0xe8d39c : 0x87c9cc,
      side: THREE.DoubleSide, transparent: true, opacity: data.id === "saturn" ? 0.82 : 0.4,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2.45;
    ring.rotation.y = data.id === "uranus" ? Math.PI / 2 : 0.18;
    group.add(ring);
  }
  const label = createLabelSprite(data.name, data.accent);
  label.position.set(0, data.radius + 2.2, 0);
  group.add(label);
  return { group, mesh, spin: 0.035 + 0.08 / data.radius };
}

export function createKnowledgeBeacon(index: number, color: string): THREE.Group {
  const group = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x243456, roughness: 0.45, metalness: 0.65 });
  const glowMat = new THREE.MeshStandardMaterial({ color, emissive: new THREE.Color(color), emissiveIntensity: 2.4, roughness: 0.2 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1, 0.38, 12), baseMat);
  base.position.y = 0.19;
  group.add(base);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 1.3, 10), baseMat);
  stem.position.y = 0.9;
  group.add(stem);
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), glowMat);
  crystal.name = "crystal";
  crystal.position.y = 1.9;
  group.add(crystal);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.055, 8, 32), glowMat);
  ring.name = "ring";
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 1.55;
  group.add(ring);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.8, 12, 16, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.name = "beam";
  beam.position.y = 7.5;
  group.add(beam);
  const label = createLabelSprite(`知识 ${index + 1}`, color, true);
  label.name = "label";
  label.position.y = 3.1;
  group.add(label);
  return group;
}

export function createStarfield(count: number, radius: number, seed = 42): THREE.Points {
  const rng = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const palette = [new THREE.Color(0xffffff), new THREE.Color(0xa9d7ff), new THREE.Color(0xffe0a3)];
  for (let i = 0; i < count; i++) {
    const theta = rng() * Math.PI * 2;
    const phi = Math.acos(2 * rng() - 1);
    const r = radius * (0.65 + rng() * 0.35);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    const c = palette[Math.floor(rng() * palette.length)];
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.55, vertexColors: true, transparent: true, opacity: 0.9, sizeAttenuation: true }));
}

export interface ChopperModel {
  group: THREE.Group;
  tick: (time: number, speed: number) => void;
}

function cylinderBetween(a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material): THREE.Mesh {
  const delta = b.clone().sub(a);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.08, delta.length(), 7), material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  return mesh;
}

export function createChopper(): ChopperModel {
  const group = new THREE.Group();
  group.name = "Chopper";
  const fur = new THREE.MeshStandardMaterial({ color: 0x9a5738, roughness: 0.88 });
  const darkFur = new THREE.MeshStandardMaterial({ color: 0x5d3528, roughness: 0.9 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xffd7ae, roughness: 0.8 });
  const pink = new THREE.MeshStandardMaterial({ color: 0xf064a7, roughness: 0.62 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x3b88c9, roughness: 0.55 });
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.65 });
  const black = new THREE.MeshStandardMaterial({ color: 0x172035, roughness: 0.5 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xffc84a, roughness: 0.55 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 18), cream);
  body.scale.set(0.9, 1.08, 0.78);
  body.position.y = 1.02;
  group.add(body);
  const vest = new THREE.Mesh(new THREE.SphereGeometry(0.64, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.62), blue);
  vest.scale.set(0.94, 0.82, 0.82);
  vest.position.set(0, 0.85, 0.02);
  group.add(vest);
  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.82, 0.34), yellow);
  backpack.position.set(0, 1.08, 0.53);
  backpack.rotation.x = -0.08;
  group.add(backpack);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.72, 28, 22), fur);
  head.scale.set(1, 0.9, 0.92);
  head.position.y = 1.92;
  group.add(head);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.46, 24, 16), cream);
  muzzle.scale.set(1.05, 0.72, 0.58);
  muzzle.position.set(0, 1.72, -0.57);
  group.add(muzzle);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.15, 18, 12), blue);
  nose.scale.set(1.15, 0.8, 0.75);
  nose.position.set(0, 1.84, -0.87);
  group.add(nose);
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.022, 6, 18, Math.PI), darkFur);
  smile.position.set(0, 1.61, -0.83);
  smile.rotation.z = Math.PI;
  group.add(smile);

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.19, 18, 12), white);
    eye.scale.set(0.82, 1.25, 0.48);
    eye.position.set(side * 0.28, 2.06, -0.58);
    group.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10), black);
    pupil.position.set(side * 0.28, 2.04, -0.72);
    group.add(pupil);
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), pink);
    cheek.scale.set(1.25, 0.6, 0.25);
    cheek.position.set(side * 0.43, 1.72, -0.75);
    group.add(cheek);

    const antlerBase = new THREE.Vector3(side * 0.52, 2.3, 0.02);
    const antlerTip = new THREE.Vector3(side * 0.9, 2.9, 0.02);
    group.add(cylinderBetween(antlerBase, antlerTip, 0.075, darkFur));
    group.add(cylinderBetween(new THREE.Vector3(side * 0.72, 2.62, 0.02), new THREE.Vector3(side * 1.03, 2.62, -0.03), 0.06, darkFur));
    group.add(cylinderBetween(new THREE.Vector3(side * 0.82, 2.75, 0.02), new THREE.Vector3(side * 0.83, 3.03, -0.04), 0.055, darkFur));
  }

  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.13, 32), blue);
  brim.position.y = 2.48;
  group.add(brim);
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.65, 0.63, 32), pink);
  hat.position.y = 2.78;
  group.add(hat);
  const hatTop = new THREE.Mesh(new THREE.CylinderGeometry(0.61, 0.61, 0.08, 32), pink);
  hatTop.position.y = 3.11;
  group.add(hatTop);
  for (const rot of [-Math.PI / 4, Math.PI / 4]) {
    const cross = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.48, 0.035), white);
    cross.position.set(0, 2.78, -0.615);
    cross.rotation.z = rot;
    group.add(cross);
  }

  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.97, 28, 20),
    new THREE.MeshPhysicalMaterial({ color: 0xc8f4ff, transparent: true, opacity: 0.12, roughness: 0.08, metalness: 0, transmission: 0.2, depthWrite: false }),
  );
  helmet.position.y = 2.05;
  group.add(helmet);

  const leftLeg = new THREE.Group();
  const rightLeg = new THREE.Group();
  for (const [leg, side] of [[leftLeg, -1], [rightLeg, 1]] as const) {
    leg.position.set(side * 0.28, 0.55, 0);
    const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.16, 0.55, 12), fur);
    limb.position.y = -0.24;
    leg.add(limb);
    const hoof = new THREE.Mesh(new THREE.SphereGeometry(0.23, 16, 10), darkFur);
    hoof.scale.set(0.85, 0.55, 1.25);
    hoof.position.set(0, -0.53, -0.08);
    leg.add(hoof);
    group.add(leg);
  }
  const leftArm = new THREE.Group();
  const rightArm = new THREE.Group();
  for (const [arm, side] of [[leftArm, -1], [rightArm, 1]] as const) {
    arm.position.set(side * 0.58, 1.35, 0);
    const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.65, 12), fur);
    limb.position.y = -0.27;
    limb.rotation.z = side * -0.18;
    arm.add(limb);
    group.add(arm);
  }
  group.scale.setScalar(0.82);

  const tick = (time: number, speed: number) => {
    const stride = Math.min(1, speed / 3);
    const swing = Math.sin(time * 10) * 0.65 * stride;
    leftLeg.rotation.x = swing;
    rightLeg.rotation.x = -swing;
    leftArm.rotation.x = -swing * 0.7;
    rightArm.rotation.x = swing * 0.7;
    body.position.y = 1.02 + Math.abs(Math.sin(time * 10)) * 0.055 * stride + Math.sin(time * 2) * 0.015;
  };
  return { group, tick };
}

function flagTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 320;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#172036"; ctx.fillRect(0, 0, 512, 320);
  ctx.strokeStyle = "#fff7df"; ctx.lineWidth = 28; ctx.lineCap = "round";
  for (const rot of [-0.55, 0.55]) {
    ctx.save(); ctx.translate(256, 180); ctx.rotate(rot);
    ctx.beginPath(); ctx.moveTo(-145, 0); ctx.lineTo(145, 0); ctx.stroke(); ctx.restore();
  }
  ctx.fillStyle = "#fff7df";
  ctx.beginPath(); ctx.arc(256, 145, 92, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(205, 185, 102, 70);
  ctx.fillStyle = "#172036";
  ctx.beginPath(); ctx.ellipse(220, 145, 22, 29, -0.15, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(292, 145, 22, 29, 0.15, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(256, 166); ctx.lineTo(244, 190); ctx.lineTo(268, 190); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#f4c44f";
  ctx.beginPath(); ctx.ellipse(256, 89, 137, 29, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(256, 70, 82, 47, 0, Math.PI, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#d44b43"; ctx.lineWidth = 15;
  ctx.beginPath(); ctx.moveTo(174, 75); ctx.quadraticCurveTo(256, 98, 338, 75); ctx.stroke();
  return canvasTexture(canvas);
}

export function createPirateFlag(): { group: THREE.Group; tick: (time: number) => void } {
  const group = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xe3c889, metalness: 0.55, roughness: 0.35 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 4.3, 12), poleMat);
  pole.position.y = 2.15;
  group.add(pole);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), poleMat);
  top.position.y = 4.35;
  group.add(top);
  const geo = new THREE.PlaneGeometry(2.65, 1.65, 14, 5);
  geo.translate(1.325, 0, 0);
  const cloth = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: flagTexture(), side: THREE.DoubleSide, roughness: 0.78 }));
  cloth.position.set(0.05, 3.35, 0);
  group.add(cloth);
  const basePositions = (geo.getAttribute("position") as THREE.BufferAttribute).array.slice() as Float32Array;
  const tick = (time: number) => {
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = basePositions[i * 3];
      pos.setZ(i, Math.sin(time * 4 + x * 2.4) * 0.1 * (x / 2.65));
    }
    pos.needsUpdate = true;
  };
  return { group, tick };
}

export function createCave(color: number): THREE.Group {
  const group = new THREE.Group();
  const rockMat = new THREE.MeshStandardMaterial({ color, roughness: 0.98 });
  const darkMat = new THREE.MeshBasicMaterial({ color: 0x080b12 });
  const mound = new THREE.Mesh(new THREE.SphereGeometry(3.4, 18, 12), rockMat);
  mound.scale.set(1.25, 0.85, 0.8);
  mound.position.set(0, 1.25, -0.7);
  group.add(mound);
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(1.85, 32), darkMat);
  mouth.scale.set(1, 1.25, 1);
  mouth.position.set(0, 1.55, 2.03);
  group.add(mouth);
  const rng = mulberry32(color + 19);
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65 + rng() * 0.28, 0), rockMat);
    rock.position.set(Math.cos(a) * 2.15, 0.35 + Math.sin(a) * 2.8, 2 + rng() * 0.2);
    rock.rotation.set(rng() * 2, rng() * 2, rng() * 2);
    rock.scale.set(0.9 + rng() * 0.4, 0.8 + rng() * 0.5, 0.75);
    group.add(rock);
  }
  for (const side of [-1, 1]) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9, 0), rockMat);
    rock.position.set(side * 2.15, 0.55, 2.05);
    group.add(rock);
  }
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffd27a }));
  glow.position.set(0, 2.3, 2.25);
  group.add(glow);
  return group;
}

export function createFallbackShuttle(): THREE.Group {
  const group = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0xf2ead8, metalness: 0.25, roughness: 0.4 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x3e72c9, metalness: 0.45, roughness: 0.35 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x76d9f1, emissive: 0x17465e, emissiveIntensity: 1.2, roughness: 0.15 });
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.75, 2.4, 8, 18), hullMat);
  hull.rotation.z = Math.PI / 2;
  group.add(hull);
  const cabin = new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 12), glassMat);
  cabin.scale.set(1.25, 0.7, 0.8); cabin.position.set(-0.4, 0.55, 0); group.add(cabin);
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.14, 1.25), trimMat);
    wing.position.set(0.35, -0.2, side * 0.95); wing.rotation.y = side * 0.28; group.add(wing);
    const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 0.65, 14), trimMat);
    thruster.rotation.z = Math.PI / 2; thruster.position.set(1.65, -0.1, side * 0.75); group.add(thruster);
  }
  group.rotation.y = -Math.PI / 2;
  return group;
}

export function disposeObject(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.Line) {
      obj.geometry?.dispose();
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of materials) {
        const withMap = mat as THREE.Material & { map?: THREE.Texture | null };
        withMap.map?.dispose();
        mat.dispose();
      }
    }
  });
}
