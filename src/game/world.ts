import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { HazardSpec, LevelDefinition, PlatformSpec, PointSpec } from "./levels";

export interface RuntimePlatform {
  spec: PlatformSpec; mesh: THREE.Mesh; base: THREE.Vector3; delta: THREE.Vector3;
  active: boolean; stoodTime: number; respawnTime: number;
}
interface RuntimeStar { mesh: THREE.Group; baseY: number; collected: boolean }
interface RuntimeHazard { spec: HazardSpec; group: THREE.Group; beam?: THREE.Mesh; active: boolean }
interface RuntimeCheckpoint { point: PointSpec; group: THREE.Group; activated: boolean }

const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();

function mulberry32(seed: number) {
  return () => {
    let t = seed += 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class GameWorld {
  readonly group = new THREE.Group();
  readonly platforms: RuntimePlatform[] = [];
  readonly hazards: RuntimeHazard[] = [];
  readonly stars: RuntimeStar[] = [];
  readonly checkpoints: RuntimeCheckpoint[] = [];
  readonly goal = new THREE.Group();
  private readonly disposables: Array<{ dispose: () => void }> = [];
  private readonly instancedMeshes: THREE.InstancedMesh[] = [];

  constructor(readonly level: LevelDefinition) {
    this.buildPlatforms();
    this.buildHazards();
    this.buildStars();
    this.buildCheckpoints();
    this.buildGoal();
    this.buildDecorations();
  }

  private material(color: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.02, ...extra });
    this.disposables.push(m);
    return m;
  }
  private geometry<T extends THREE.BufferGeometry>(g: T): T { this.disposables.push(g); return g; }

  private buildPlatforms() {
    const side = this.material(this.level.colors.platform);
    const top = this.material(this.level.colors.top);
    const bounce = this.material(0xffc857, { emissive: 0x6b3400, emissiveIntensity: 0.12 });
    const crumble = this.material(0xc59be8);
    for (const spec of this.level.platforms) {
      const geo = this.geometry(new RoundedBoxGeometry(spec.w, spec.h, spec.d, 3, 0.16));
      const mat = spec.kind === "bounce" ? bounce : spec.kind === "crumble" ? crumble : side;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(spec.x, spec.y, spec.z);
      mesh.receiveShadow = true; mesh.castShadow = true;
      this.group.add(mesh);
      const cap = new THREE.Mesh(this.geometry(new RoundedBoxGeometry(spec.w * 0.96, 0.12, spec.d * 0.96, 2, 0.05)), spec.kind === "bounce" ? bounce : top);
      cap.position.y = spec.h / 2 + 0.02; cap.receiveShadow = true; mesh.add(cap);
      if (spec.kind === "bounce") {
        for (let i = -1; i <= 1; i++) {
          const ring = new THREE.Mesh(this.geometry(new THREE.TorusGeometry(0.4 + Math.abs(i) * 0.12, 0.07, 8, 20)), this.material(0xfff2a8));
          ring.rotation.x = -Math.PI / 2; ring.position.set(i * 0.85, spec.h / 2 + 0.13, 0); mesh.add(ring);
        }
      }
      this.platforms.push({ spec, mesh, base: mesh.position.clone(), delta: new THREE.Vector3(), active: true, stoodTime: 0, respawnTime: 0 });
    }
  }

  private buildHazards() {
    const spikeMat = this.material(0xff5d73, { emissive: 0x7b1027, emissiveIntensity: 0.22 });
    const dark = this.material(0x414766, { metalness: 0.35 });
    for (const spec of this.level.hazards) {
      const group = new THREE.Group(); group.position.set(spec.x, spec.y, spec.z); this.group.add(group);
      const runtime: RuntimeHazard = { spec, group, active: true };
      if (spec.kind === "spikes") {
        const count = Math.max(2, Math.round((spec.w ?? 1.5) * 3));
        for (let i = 0; i < count; i++) {
          const cone = new THREE.Mesh(this.geometry(new THREE.ConeGeometry(0.18, 0.65, 6)), spikeMat);
          cone.position.set((i / (count - 1) - 0.5) * (spec.w ?? 1.5), 0.28, 0); cone.castShadow = true; group.add(cone);
        }
        const base = new THREE.Mesh(this.geometry(new RoundedBoxGeometry((spec.w ?? 1.5) + 0.25, 0.12, spec.d ?? 1, 2, 0.04)), dark);
        base.position.y = -0.06; group.add(base);
      } else if (spec.kind === "sweeper") {
        const length = spec.length ?? 5;
        const pole = new THREE.Mesh(this.geometry(new THREE.CylinderGeometry(0.2, 0.25, 1.2, 12)), dark);
        pole.position.y = 0.25; group.add(pole);
        const bar = new THREE.Mesh(this.geometry(new RoundedBoxGeometry(length, 0.24, 0.32, 2, 0.1)), spikeMat);
        bar.position.y = 0.65; bar.castShadow = true; group.add(bar);
        for (const x of [-length / 2, length / 2]) {
          const bulb = new THREE.Mesh(this.geometry(new THREE.SphereGeometry(0.27, 12, 8)), spikeMat);
          bulb.position.set(x, 0.65, 0); group.add(bulb);
        }
      } else if (spec.kind === "slime") {
        const blob = new THREE.Mesh(this.geometry(new THREE.CylinderGeometry((spec.w ?? 2) * 0.55, (spec.w ?? 2) * 0.65, 0.12, 24)), this.material(0x6dd9a0, { emissive: 0x174f39, emissiveIntensity: 0.15 }));
        blob.scale.z = (spec.d ?? 2) / (spec.w ?? 2); blob.position.y = -0.04; group.add(blob);
      } else {
        const width = spec.w ?? 5;
        for (const x of [-width / 2, width / 2]) {
          const post = new THREE.Mesh(this.geometry(new THREE.CylinderGeometry(0.16, 0.22, 2.4, 10)), dark);
          post.position.set(x, 0.8, 0); group.add(post);
        }
        const beamMat = this.material(0xff6f91, { emissive: 0xff174f, emissiveIntensity: 1.5, transparent: true, opacity: 0.82 });
        const beam = new THREE.Mesh(this.geometry(new THREE.CylinderGeometry(0.07, 0.07, width, 8)), beamMat);
        beam.rotation.z = Math.PI / 2; beam.position.y = 0.75; group.add(beam); runtime.beam = beam;
      }
      this.hazards.push(runtime);
    }
  }

  private buildStars() {
    const gold = this.material(0xffd84d, { emissive: 0xff9d00, emissiveIntensity: 0.42, metalness: 0.18 });
    for (const point of this.level.stars) {
      const group = new THREE.Group(); group.position.set(point.x, point.y, point.z);
      const gem = new THREE.Mesh(this.geometry(new THREE.OctahedronGeometry(0.34, 0)), gold);
      gem.scale.y = 1.25; gem.castShadow = true; group.add(gem);
      const ring = new THREE.Mesh(this.geometry(new THREE.TorusGeometry(0.48, 0.025, 6, 24)), gold);
      ring.rotation.x = Math.PI / 2; group.add(ring);
      this.group.add(group); this.stars.push({ mesh: group, baseY: point.y, collected: false });
    }
  }

  private buildCheckpoints() {
    for (const point of this.level.checkpoints) {
      const group = new THREE.Group(); group.position.set(point.x, point.y, point.z);
      const pole = new THREE.Mesh(this.geometry(new THREE.CylinderGeometry(0.05, 0.07, 2.2, 8)), this.material(0xffffff));
      pole.position.y = 1.05; group.add(pole);
      const flag = new THREE.Mesh(this.geometry(new THREE.ConeGeometry(0.48, 1.1, 3)), this.material(0x6b7b8c));
      flag.rotation.z = -Math.PI / 2; flag.position.set(0.48, 1.72, 0); group.add(flag);
      const ring = new THREE.Mesh(this.geometry(new THREE.TorusGeometry(0.7, 0.06, 8, 30)), this.material(0x94a3b8));
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.05; group.add(ring);
      this.group.add(group); this.checkpoints.push({ point, group, activated: false });
    }
  }

  private buildGoal() {
    this.goal.position.set(this.level.goal.x, this.level.goal.y, this.level.goal.z);
    const mat = this.material(this.level.colors.accent, { emissive: this.level.colors.accent, emissiveIntensity: 0.8 });
    const ring = new THREE.Mesh(this.geometry(new THREE.TorusGeometry(1.25, 0.16, 12, 40)), mat);
    ring.position.y = 1.25; this.goal.add(ring);
    const inner = new THREE.Mesh(this.geometry(new THREE.CircleGeometry(1.08, 36)), this.material(this.level.colors.accent, { transparent: true, opacity: 0.22, side: THREE.DoubleSide }));
    inner.position.y = 1.25; this.goal.add(inner);
    const base = new THREE.Mesh(this.geometry(new THREE.CylinderGeometry(1.5, 1.7, 0.22, 32)), mat);
    this.goal.add(base); this.group.add(this.goal);
  }

  private buildDecorations() {
    const random = mulberry32(9137 + this.level.id * 131);
    const cloudMat = this.material(0xffffff, { transparent: true, opacity: this.level.id === 2 ? 0.22 : 0.68 });
    for (let i = 0; i < 12; i++) {
      const cloud = new THREE.Group();
      const side = i % 2 === 0 ? -1 : 1;
      cloud.position.set(side * (9 + random() * 12), -2 + random() * 5, 8 - random() * 150);
      for (let j = 0; j < 3; j++) {
        const puff = new THREE.Mesh(this.geometry(new THREE.SphereGeometry(1.2 + random(), 10, 7)), cloudMat);
        puff.position.set(j * 1.5, random() * 0.5, 0); cloud.add(puff);
      }
      this.group.add(cloud);
    }
    const tuftGeo = this.geometry(new THREE.ConeGeometry(0.16, 0.65, 5));
    const tuftMat = this.material(this.level.id === 2 ? 0x7cf4e1 : 0x78bd87);
    const count = 48;
    const inst = new THREE.InstancedMesh(tuftGeo, tuftMat, count);
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      const platform = this.level.platforms[i % this.level.platforms.length];
      const x = platform.x + (random() - 0.5) * platform.w * 0.8;
      const z = platform.z + (random() - 0.5) * platform.d * 0.8;
      matrix.makeTranslation(x, platform.y + platform.h / 2 + 0.3, z); inst.setMatrixAt(i, matrix);
    }
    this.group.add(inst); this.instancedMeshes.push(inst);
  }

  update(dt: number, time: number) {
    for (const platform of this.platforms) {
      platform.delta.set(0, 0, 0);
      if (!platform.active) {
        platform.respawnTime -= dt;
        platform.mesh.position.y -= dt * 5;
        if (platform.respawnTime <= 0) {
          platform.active = true; platform.stoodTime = 0; platform.mesh.visible = true; platform.mesh.position.copy(platform.base);
        }
        continue;
      }
      const { spec } = platform;
      v1.copy(platform.mesh.position);
      if (spec.kind === "moving") {
        const offset = Math.sin(time * (spec.speed ?? 1) + (spec.phase ?? 0)) * (spec.range ?? 2);
        platform.mesh.position.copy(platform.base);
        if (spec.axis === "y") platform.mesh.position.y += offset; else platform.mesh.position.x += offset;
      }
      if (spec.kind === "crumble" && platform.stoodTime > 0) {
        platform.stoodTime += dt;
        platform.mesh.rotation.z = Math.sin(time * 35) * Math.min(0.035, platform.stoodTime * 0.025);
        if (platform.stoodTime > 0.85) {
          platform.active = false; platform.respawnTime = 3.2; platform.mesh.rotation.z = 0;
        }
      }
      platform.delta.copy(platform.mesh.position).sub(v1);
    }
    for (const hazard of this.hazards) {
      if (hazard.spec.kind === "sweeper") hazard.group.rotation.y = time * (hazard.spec.speed ?? 1.4) + (hazard.spec.phase ?? 0);
      if (hazard.spec.kind === "laser" && hazard.beam) {
        hazard.active = Math.sin(time * (hazard.spec.speed ?? 1.5) + (hazard.spec.phase ?? 0)) > -0.12;
        hazard.beam.visible = hazard.active;
        hazard.beam.scale.y = 0.85 + Math.sin(time * 18) * 0.12;
      }
    }
    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i]; if (star.collected) continue;
      star.mesh.rotation.y = time * 1.8 + i; star.mesh.position.y = star.baseY + Math.sin(time * 2.4 + i) * 0.16;
    }
    this.goal.rotation.y = Math.sin(time * 0.8) * 0.08;
  }

  landing(x: number, z: number, previousY: number, nextY: number): RuntimePlatform | null {
    let best: RuntimePlatform | null = null; let bestTop = -Infinity;
    for (const platform of this.platforms) {
      if (!platform.active) continue;
      const { spec } = platform; const px = platform.mesh.position.x; const py = platform.mesh.position.y; const pz = platform.mesh.position.z;
      const top = py + spec.h / 2;
      if (Math.abs(x - px) > spec.w / 2 + 0.18 || Math.abs(z - pz) > spec.d / 2 + 0.18) continue;
      if (previousY >= top - 0.14 && nextY <= top + 0.16 && top > bestTop) { best = platform; bestTop = top; }
    }
    return best;
  }

  stillOn(platform: RuntimePlatform, x: number, z: number) {
    return platform.active && Math.abs(x - platform.mesh.position.x) <= platform.spec.w / 2 + 0.12 && Math.abs(z - platform.mesh.position.z) <= platform.spec.d / 2 + 0.12;
  }

  hazardAt(position: THREE.Vector3): "damage" | "slow" | null {
    for (const hazard of this.hazards) {
      const spec = hazard.spec;
      const dx = position.x - hazard.group.position.x; const dz = position.z - hazard.group.position.z;
      if (spec.kind === "spikes" && Math.abs(dx) < (spec.w ?? 1.5) / 2 + 0.12 && Math.abs(dz) < (spec.d ?? 1) / 2 + 0.25 && Math.abs(position.y - spec.y) < 0.8) return "damage";
      if (spec.kind === "slime" && Math.abs(dx) < (spec.w ?? 2) / 2 && Math.abs(dz) < (spec.d ?? 2) / 2 && Math.abs(position.y - spec.y) < 0.5) return "slow";
      if (spec.kind === "laser" && hazard.active && Math.abs(dx) < (spec.w ?? 5) / 2 && Math.abs(dz) < 0.34 && position.y < spec.y + 1.4 && position.y + 2 > spec.y + 0.4) return "damage";
      if (spec.kind === "sweeper") {
        const angle = -hazard.group.rotation.y; const length = (spec.length ?? 5) / 2;
        const lx = dx * Math.cos(angle) - dz * Math.sin(angle); const lz = dx * Math.sin(angle) + dz * Math.cos(angle);
        if (Math.abs(lx) < length + 0.25 && Math.abs(lz) < 0.36 && position.y < spec.y + 0.85 && position.y + 1.8 > spec.y + 0.45) return "damage";
      }
    }
    return null;
  }

  collectStars(position: THREE.Vector3): number {
    let count = 0;
    for (const star of this.stars) {
      if (star.collected) continue;
      if (star.mesh.position.distanceToSquared(v2.copy(position).add(v1.set(0, 1, 0))) < 1.45) {
        star.collected = true; star.mesh.visible = false; count++;
      }
    }
    return count;
  }

  activateCheckpoint(position: THREE.Vector3): number {
    for (let i = 0; i < this.checkpoints.length; i++) {
      const cp = this.checkpoints[i];
      if (!cp.activated && cp.group.position.distanceToSquared(position) < 5.2) {
        cp.activated = true;
        cp.group.children.forEach((child, index) => {
          const mesh = child as THREE.Mesh; if (!mesh.isMesh) return;
          mesh.material = this.material(index === 1 ? 0x5eead4 : 0xffd84d, { emissive: 0x1a8d7a, emissiveIntensity: 0.35 });
        });
        return i;
      }
    }
    return -1;
  }

  atGoal(position: THREE.Vector3) { return this.goal.position.distanceToSquared(position) < 4.2; }
  checkpointPosition(index: number, target: THREE.Vector3) {
    if (index >= 0) return target.copy(this.checkpoints[index].group.position).add(v1.set(0, 0.08, 0.6));
    return target.set(this.level.spawn.x, this.level.spawn.y, this.level.spawn.z);
  }
  dispose() {
    for (const mesh of this.instancedMeshes) mesh.dispose(); this.instancedMeshes.length = 0;
    for (const d of this.disposables) d.dispose(); this.disposables.length = 0;
  }
}
