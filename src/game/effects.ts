import * as THREE from "three";

/** Fixed-size particle pool: no allocations or scene-graph churn during play. */
export class ParticleBurst {
  readonly points: THREE.Points;
  private readonly count = 120;
  private readonly positions = new Float32Array(this.count * 3);
  private readonly colors = new Float32Array(this.count * 3);
  private readonly velocities = new Float32Array(this.count * 3);
  private readonly lives = new Float32Array(this.count);
  private cursor = 0;
  private readonly color = new THREE.Color();

  constructor() {
    for (let i = 0; i < this.count; i++) this.positions[i * 3 + 1] = -100;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(this.colors, 3));
    const material = new THREE.PointsMaterial({ size: 0.17, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false });
    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
  }

  spawn(origin: THREE.Vector3, color: number, amount = 12, force = 3) {
    this.color.setHex(color);
    for (let n = 0; n < amount; n++) {
      const i = this.cursor++ % this.count; const k = i * 3;
      const angle = (n / amount) * Math.PI * 2 + this.cursor * 0.37;
      this.positions[k] = origin.x; this.positions[k + 1] = origin.y + 0.8; this.positions[k + 2] = origin.z;
      this.velocities[k] = Math.cos(angle) * force * (0.45 + (n % 3) * 0.18);
      this.velocities[k + 1] = 1.6 + (n % 4) * 0.55;
      this.velocities[k + 2] = Math.sin(angle) * force * (0.45 + (n % 3) * 0.18);
      this.colors[k] = this.color.r; this.colors[k + 1] = this.color.g; this.colors[k + 2] = this.color.b;
      this.lives[i] = 0.65 + (n % 3) * 0.12;
    }
    (this.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.points.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  update(dt: number) {
    let changed = false;
    for (let i = 0; i < this.count; i++) {
      if (this.lives[i] <= 0) continue;
      changed = true; this.lives[i] -= dt; const k = i * 3;
      if (this.lives[i] <= 0) { this.positions[k + 1] = -100; continue; }
      this.velocities[k + 1] -= 7 * dt;
      this.positions[k] += this.velocities[k] * dt;
      this.positions[k + 1] += this.velocities[k + 1] * dt;
      this.positions[k + 2] += this.velocities[k + 2] * dt;
    }
    if (changed) (this.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose() { this.points.geometry.dispose(); (this.points.material as THREE.Material).dispose(); }
}
