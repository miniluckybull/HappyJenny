import * as THREE from "three";
import { AudioSystem } from "./audio";
import { Input } from "./input";
import { GameStateMachine } from "./state";
import { storage } from "./storage";
import { PLANETS, PLANET_BY_ID, type PlanetData } from "./planet-data";
import type { DialogState, GameHandle, GameMode, QualityLevel, SaveData, UIState } from "./types";
import {
  createCave, createChopper, createFallbackShuttle, createKnowledgeBeacon, createLabelSprite,
  createPirateFlag, createPlanet, createPlanetTexture, createStarfield, disposeObject, mulberry32,
  type ChopperModel, type PlanetVisual,
} from "./space-models";

interface Interactable { type: "planet" | "beacon" | "cave" | "ship" | "flag" | "exit"; index?: number; id?: string }
interface ShuttleModule { createAsset: (ns: typeof THREE, options: Record<string, unknown>) => Promise<THREE.Group> }

const SAVE_KEY = "chopper-astro-v1";
const VALID_IDS = new Set(PLANETS.map((p) => p.id));
const UP = new THREE.Vector3(0, 1, 0);
const clamp = THREE.MathUtils.clamp;
const damp = THREE.MathUtils.damp;

function approachAngle(current: number, target: number, lambda: number, dt: number): number {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * (1 - Math.exp(-lambda * dt));
}

export class Adventure {
  readonly renderer: THREE.WebGLRenderer;
  readonly camera: THREE.PerspectiveCamera;
  readonly input: Input;
  readonly audio = new AudioSystem();
  readonly fsm = new GameStateMachine();
  readonly shipRig = new THREE.Group();
  readonly chopper: ChopperModel = createChopper();

  mode: GameMode = "space";
  ready = false;
  quality: QualityLevel = "high";
  private solarScene!: THREE.Scene;
  private surfaceScene: THREE.Scene | null = null;
  private caveScene: THREE.Scene | null = null;
  private shipModel: THREE.Group = createFallbackShuttle();
  private engineGlow!: THREE.Mesh;
  private planets = new Map<string, PlanetVisual>();
  private flagBadges = new Map<string, THREE.Sprite>();
  private selectionRing!: THREE.Mesh;
  private asteroidMesh!: THREE.InstancedMesh;
  private asteroidPositions: THREE.Vector3[] = [];
  private beacons: THREE.Group[] = [];
  private beaconPositions: THREE.Vector3[] = [];
  private cavePosition = new THREE.Vector3();
  private caveFlag: THREE.Group | null = null;
  private surfaceFlag: { group: THREE.Group; tick: (time: number) => void } | null = null;
  private scanPulse: THREE.Mesh | null = null;
  private shipAssetDispose: (() => Promise<void>) | null = null;

  private learned: Record<string, number[]> = Object.fromEntries(PLANETS.map((p) => [p.id, []]));
  private caves = new Set<string>();
  private flags = new Set<string>();
  private currentPlanet = "earth";
  private targetPlanet = "earth";
  private autopilot = false;
  private shipYaw = 0;
  private shipSpeed = 0;
  private cameraYaw = 0;
  private cameraPitch = 0.28;
  private playerVelocity = new THREE.Vector3();
  private nearest: Interactable | null = null;
  private prompt = "";
  private objective = "选择一颗行星开始考察";
  private targetDistance = 0;
  private bearing = 0;
  private shield = 100;
  private scanEnergy = 100;
  private scannerTimer = 0;
  private scanWave = 0;
  private collisionCooldown = 0;
  private dialog: DialogState | null = null;
  private toast = "";
  private toastTimer = 0;
  private elapsed = 0;
  private visualTime = 0;
  private uiTimer = 0;
  private fps = 60;
  private lastRenderTime = performance.now();
  private shake = 0;
  private titleOrbit = 0;
  private hasLanded = new Set<string>();
  private tmpA = new THREE.Vector3();
  private tmpB = new THREE.Vector3();
  private tmpC = new THREE.Vector3();
  private tmpMatrix = new THREE.Matrix4();
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private disposed = false;

  constructor(private canvas: HTMLCanvasElement, private onUI: (state: UIState) => void) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.08, 600);
    this.input = new Input(canvas);
    this.shipRig.add(this.shipModel);
    this.chopper.group.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = true; });
    this.loadSave();
    this.buildSolarSystem();
    this.shipRig.position.copy(this.planets.get("earth")!.group.position).add(new THREE.Vector3(0, 0.7, 8));
    this.shipYaw = 0;
    this.shipRig.rotation.y = this.shipYaw;
    this.camera.position.set(0, 90, 128);
    this.camera.lookAt(0, 0, 0);
    this.emitUI();
    void this.loadShuttle();
  }

  private async loadShuttle(): Promise<void> {
    try {
      const moduleURL = new URL(`${import.meta.env.BASE_URL}assets/shuttle/asset.js`, document.baseURI).href;
      const mod = await import(/* @vite-ignore */ moduleURL) as ShuttleModule;
      const root = await mod.createAsset(THREE, { states: "lazy", sharedResources: false });
      if (this.disposed) return;
      const bounds = new THREE.Box3().setFromObject(root);
      const size = bounds.getSize(new THREE.Vector3());
      const placement = new THREE.Group();
      placement.add(root);
      placement.scale.setScalar(3.9 / Math.max(size.x, size.y, size.z));
      placement.rotation.y = -Math.PI / 2;
      this.shipRig.remove(this.shipModel);
      disposeObject(this.shipModel);
      this.shipModel = placement;
      this.shipRig.add(placement);
      this.shipAssetDispose = async () => {
        const disposable = root as THREE.Group & { dispose?: () => Promise<void> };
        await disposable.dispose?.();
      };
    } catch {
      // The locally generated shuttle remains fully usable if the optional asset cannot load.
    } finally {
      this.ready = true;
      this.emitUI();
    }
  }

  private loadSave(): void {
    const fallback: SaveData = { version: 1, learned: this.learned, caves: [], flags: [], muted: false, quality: "high" };
    const save = storage.get<SaveData>(SAVE_KEY, fallback);
    if (save && save.version === 1) {
      for (const p of PLANETS) {
        const entries = save.learned?.[p.id];
        if (Array.isArray(entries)) this.learned[p.id] = [...new Set(entries.filter((n) => Number.isInteger(n) && n >= 0 && n < 3))];
      }
      this.caves = new Set((save.caves ?? []).filter((id) => VALID_IDS.has(id)));
      this.flags = new Set((save.flags ?? []).filter((id) => VALID_IDS.has(id)));
      this.quality = save.quality === "low" ? "low" : "high";
    }
  }

  private save(): void {
    storage.set<SaveData>(SAVE_KEY, { version: 1, learned: this.learned, caves: [...this.caves], flags: [...this.flags], muted: this.audio.muted, quality: this.quality });
  }

  private buildSolarSystem(): void {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060b20);
    scene.add(createStarfield(this.quality === "high" ? 1500 : 700, 280, 2026));
    scene.add(new THREE.HemisphereLight(0x9db9ff, 0x25163f, 1.15));
    const sunlight = new THREE.PointLight(0xffe2b0, 1600, 260, 1.6);
    scene.add(sunlight);

    const sun = new THREE.Mesh(new THREE.SphereGeometry(7, 48, 32), new THREE.MeshBasicMaterial({ color: 0xffb832 }));
    sun.name = "Sun";
    scene.add(sun);
    const corona = new THREE.Mesh(new THREE.SphereGeometry(8.3, 32, 20), new THREE.MeshBasicMaterial({ color: 0xff9b32, transparent: true, opacity: 0.18, side: THREE.BackSide }));
    scene.add(corona);
    const sunLabel = createLabelSprite("太阳", "#ffd166");
    sunLabel.position.set(0, 10, 0);
    scene.add(sunLabel);

    for (let i = 0; i < PLANETS.length; i++) {
      const data = PLANETS[i];
      const points: THREE.Vector3[] = [];
      for (let j = 0; j < 160; j++) {
        const a = (j / 160) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(a) * data.orbit, -0.08, Math.sin(a) * data.orbit));
      }
      const orbit = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0x53709b, transparent: true, opacity: 0.25 }));
      scene.add(orbit);
      const visual = createPlanet(data);
      const angle = i * 0.79 + 0.35;
      visual.group.position.set(Math.cos(angle) * data.orbit, 0, Math.sin(angle) * data.orbit);
      visual.group.userData.planetId = data.id;
      scene.add(visual.group);
      this.planets.set(data.id, visual);
      const badge = createLabelSprite("✓ 已插旗", "#71e6b1", true);
      badge.position.set(0, data.radius + 4, 0);
      badge.visible = this.flags.has(data.id);
      visual.group.add(badge);
      this.flagBadges.set(data.id, badge);
    }

    this.selectionRing = new THREE.Mesh(new THREE.RingGeometry(1.04, 1.12, 64), new THREE.MeshBasicMaterial({ color: 0xffdf6e, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
    this.selectionRing.rotation.x = -Math.PI / 2;
    scene.add(this.selectionRing);

    const asteroidGeo = new THREE.DodecahedronGeometry(0.65, 0);
    const asteroidMat = new THREE.MeshStandardMaterial({ color: 0x766e72, roughness: 0.95 });
    const count = this.quality === "high" ? 70 : 40;
    this.asteroidMesh = new THREE.InstancedMesh(asteroidGeo, asteroidMat, count);
    const rng = mulberry32(7701);
    for (let i = 0; i < count; i++) {
      const a = rng() * Math.PI * 2;
      const r = 47 + (rng() - 0.5) * 4;
      const pos = new THREE.Vector3(Math.cos(a) * r, (rng() - 0.5) * 3.4, Math.sin(a) * r);
      const scale = 0.35 + rng() * 0.8;
      this.tmpMatrix.compose(pos, new THREE.Quaternion().setFromEuler(new THREE.Euler(rng() * 3, rng() * 3, rng() * 3)), new THREE.Vector3(scale, scale * 0.8, scale));
      this.asteroidMesh.setMatrixAt(i, this.tmpMatrix);
      this.asteroidPositions.push(pos);
    }
    scene.add(this.asteroidMesh);

    this.engineGlow = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.9, 16), new THREE.MeshBasicMaterial({ color: 0x55dffc, transparent: true, opacity: 0.75 }));
    this.engineGlow.rotation.x = -Math.PI / 2;
    this.engineGlow.position.set(0, 0, 1.65);
    this.shipRig.add(this.engineGlow);
    scene.add(this.shipRig);
    this.solarScene = scene;
    this.updateSelectionRing();
  }

  private updateSelectionRing(): void {
    const visual = this.planets.get(this.targetPlanet);
    if (!visual) return;
    this.selectionRing.position.copy(visual.group.position);
    this.selectionRing.position.y = 0.12;
    this.selectionRing.scale.setScalar(visual.mesh.geometry.boundingSphere?.radius ?? PLANET_BY_ID[this.targetPlanet].radius + 1);
    const s = PLANET_BY_ID[this.targetPlanet].radius + 1.2;
    this.selectionRing.scale.setScalar(s);
  }

  private terrainHeight(x: number, z: number, seed: number): number {
    const broad = Math.sin((x + seed) * 0.105) * Math.cos((z - seed) * 0.09) * 0.72;
    const detail = Math.sin(x * 0.31 + seed) * Math.cos(z * 0.27) * 0.22;
    return broad + detail;
  }

  private clearSurface(): void {
    if (!this.surfaceScene) return;
    this.surfaceScene.remove(this.shipRig);
    this.surfaceScene.remove(this.chopper.group);
    disposeObject(this.surfaceScene);
    this.surfaceScene = null;
    this.beacons = [];
    this.beaconPositions = [];
    this.scanPulse = null;
    this.surfaceFlag = null;
  }

  private clearCave(): void {
    if (!this.caveScene) return;
    this.caveScene.remove(this.chopper.group);
    disposeObject(this.caveScene);
    this.caveScene = null;
    this.caveFlag = null;
  }

  private buildSurface(id: string): void {
    this.clearCave();
    this.clearSurface();
    this.solarScene.remove(this.shipRig);
    const data = PLANET_BY_ID[id];
    this.currentPlanet = id;
    this.targetPlanet = id;
    this.mode = "surface";
    this.autopilot = false;
    this.shipSpeed = 0;
    this.cameraYaw = 0;
    this.cameraPitch = 0.28;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(data.sky);
    scene.fog = new THREE.Fog(data.sky, 38, 100);
    this.surfaceScene = scene;
    const skyLight = new THREE.HemisphereLight(new THREE.Color(data.sky).lerp(new THREE.Color(0xffffff), 0.45), data.ground, 2.1);
    scene.add(skyLight);
    const key = new THREE.DirectionalLight(0xfff0d0, 3.1);
    key.position.set(-18, 30, 14);
    key.castShadow = this.quality === "high";
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -35; key.shadow.camera.right = 35; key.shadow.camera.top = 35; key.shadow.camera.bottom = -35;
    scene.add(key);
    if (!["earth", "venus", "saturn"].includes(id)) scene.add(createStarfield(this.quality === "high" ? 700 : 300, 180, data.orbit));

    const groundGeo = new THREE.PlaneGeometry(96, 96, 48, 48);
    groundGeo.rotateX(-Math.PI / 2);
    const pos = groundGeo.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setY(i, this.terrainHeight(pos.getX(i), pos.getZ(i), data.orbit));
    groundGeo.computeVertexNormals();
    const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ color: data.ground, roughness: 0.96, metalness: id === "mercury" ? 0.12 : 0 }));
    ground.receiveShadow = true;
    scene.add(ground);

    const rng = mulberry32(data.orbit * 101);
    const rockCount = this.quality === "high" ? 58 : 30;
    const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.8, 0), new THREE.MeshStandardMaterial({ color: new THREE.Color(data.ground).multiplyScalar(0.68), roughness: 0.95 }), rockCount);
    for (let i = 0; i < rockCount; i++) {
      const a = rng() * Math.PI * 2;
      const r = 7 + rng() * 35;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const s = 0.25 + rng() * 1.15;
      this.tmpA.set(x, this.terrainHeight(x, z, data.orbit) + s * 0.35, z);
      this.tmpMatrix.compose(this.tmpA, new THREE.Quaternion().setFromEuler(new THREE.Euler(rng() * 2, rng() * 2, rng() * 2)), new THREE.Vector3(s, s * (0.55 + rng() * 0.6), s));
      rocks.setMatrixAt(i, this.tmpMatrix);
    }
    rocks.castShadow = true; rocks.receiveShadow = true;
    scene.add(rocks);

    if (id === "earth") this.addEarthDetails(scene, data, rng);
    if (["jupiter", "saturn", "uranus", "neptune"].includes(id)) this.addGiantInSky(scene, data);
    if (id === "mars") this.addVolcano(scene, data);
    if (id === "neptune") this.addIceGeysers(scene, data);

    this.beacons = [];
    this.beaconPositions = [];
    for (let i = 0; i < 3; i++) {
      const angle = data.orbit * 0.07 + i * (Math.PI * 2 / 3) + 0.6;
      const radius = 13 + i * 5;
      const p = new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      p.y = this.terrainHeight(p.x, p.z, data.orbit);
      const beacon = createKnowledgeBeacon(i, data.accent);
      beacon.position.copy(p);
      const learned = this.learned[id].includes(i);
      beacon.traverse((obj) => {
        if (obj.name === "crystal" && obj instanceof THREE.Mesh) {
          const mat = obj.material as THREE.MeshStandardMaterial;
          if (learned) { mat.color.set(0x71e6b1); mat.emissive.set(0x71e6b1); }
        }
      });
      scene.add(beacon);
      this.beacons.push(beacon);
      this.beaconPositions.push(p);
    }

    const caveAngle = data.orbit * 0.11 + 1.7;
    this.cavePosition.set(Math.cos(caveAngle) * 27, 0, Math.sin(caveAngle) * 27);
    this.cavePosition.y = this.terrainHeight(this.cavePosition.x, this.cavePosition.z, data.orbit);
    const cave = createCave(new THREE.Color(data.ground).multiplyScalar(0.72).getHex());
    cave.position.copy(this.cavePosition);
    const towardCenter = this.cavePosition.clone().multiplyScalar(-1);
    cave.rotation.y = Math.atan2(towardCenter.x, towardCenter.z);
    scene.add(cave);
    const caveLabel = createLabelSprite("天然洞穴", data.accent, true);
    caveLabel.position.copy(this.cavePosition).add(new THREE.Vector3(0, 5.5, 0));
    scene.add(caveLabel);

    if (this.flags.has(id)) {
      this.surfaceFlag = createPirateFlag();
      this.surfaceFlag.group.position.copy(this.cavePosition).add(new THREE.Vector3(4, 0, 0));
      this.surfaceFlag.group.scale.setScalar(0.8);
      scene.add(this.surfaceFlag.group);
    }

    const shipY = this.terrainHeight(0, 0, data.orbit) + 1.1;
    this.shipRig.position.set(0, shipY, 0);
    this.shipRig.rotation.set(0, 0, 0);
    this.engineGlow.visible = false;
    scene.add(this.shipRig);
    this.chopper.group.position.set(0, this.terrainHeight(0, 7, data.orbit), 7);
    this.chopper.group.rotation.set(0, 0, 0);
    scene.add(this.chopper.group);

    this.scanPulse = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 64), new THREE.MeshBasicMaterial({ color: data.color, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
    this.scanPulse.rotation.x = -Math.PI / 2;
    this.scanPulse.visible = false;
    scene.add(this.scanPulse);
    this.scannerTimer = 0;
    this.scanWave = 0;
    this.nearest = null;
    this.toastMessage(`安全着陆：${data.landing}`);
    if (!this.hasLanded.has(id)) {
      this.hasLanded.add(id);
      this.dialog = { kind: "notice", planetId: id, title: `抵达${data.landingShort}`, tag: data.kind, body: `${data.description}\n\n跟随知识信标完成 3 张知识卡。按 Q 扫描方向，找到洞穴后就能建立营地。` };
    }
    this.emitUI();
  }

  private addEarthDetails(scene: THREE.Scene, data: PlanetData, rng: () => number): void {
    const count = 18;
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.13, 0.2, 1.4, 7), new THREE.MeshStandardMaterial({ color: 0x765038, roughness: 1 }), count);
    const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.85, 1), new THREE.MeshStandardMaterial({ color: 0x2f7e54, roughness: 0.9 }), count);
    for (let i = 0; i < count; i++) {
      const a = rng() * Math.PI * 2, r = 10 + rng() * 30;
      const x = Math.cos(a) * r, z = Math.sin(a) * r, y = this.terrainHeight(x, z, data.orbit);
      this.tmpMatrix.makeTranslation(x, y + 0.7, z); trunks.setMatrixAt(i, this.tmpMatrix);
      const s = 0.75 + rng() * 0.7;
      this.tmpMatrix.compose(new THREE.Vector3(x, y + 1.8, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s)); crowns.setMatrixAt(i, this.tmpMatrix);
    }
    scene.add(trunks, crowns);
    const water = new THREE.Mesh(new THREE.CircleGeometry(6.5, 48), new THREE.MeshPhysicalMaterial({ color: 0x3b9fc4, roughness: 0.18, metalness: 0.05, transparent: true, opacity: 0.86 }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(-15, this.terrainHeight(-15, -4, data.orbit) + 0.18, -4);
    scene.add(water);
  }

  private addGiantInSky(scene: THREE.Scene, data: PlanetData): void {
    const giant = new THREE.Mesh(new THREE.SphereGeometry(10, 40, 24), new THREE.MeshBasicMaterial({ map: createPlanetTexture(data, 77) }));
    giant.position.set(-28, 25, -65);
    giant.rotation.z = data.id === "uranus" ? 1.4 : 0.1;
    scene.add(giant);
    if (data.id === "saturn") {
      const rings = new THREE.Mesh(new THREE.RingGeometry(13, 21, 72), new THREE.MeshBasicMaterial({ color: 0xe3cc91, side: THREE.DoubleSide, transparent: true, opacity: 0.75 }));
      rings.position.copy(giant.position);
      rings.rotation.set(1.05, 0.2, 0.25);
      scene.add(rings);
    }
  }

  private addVolcano(scene: THREE.Scene, data: PlanetData): void {
    const volcano = new THREE.Mesh(new THREE.ConeGeometry(9, 8, 24, 4, true), new THREE.MeshStandardMaterial({ color: 0x66372f, roughness: 1, side: THREE.DoubleSide }));
    volcano.position.set(-27, this.terrainHeight(-27, -28, data.orbit) + 3.2, -28);
    scene.add(volcano);
  }

  private addIceGeysers(scene: THREE.Scene, data: PlanetData): void {
    for (let i = 0; i < 4; i++) {
      const plume = new THREE.Mesh(new THREE.ConeGeometry(0.35, 5 + i, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xc9edff, transparent: true, opacity: 0.25, side: THREE.DoubleSide }));
      plume.position.set(-18 + i * 4, this.terrainHeight(-18 + i * 4, -24, data.orbit) + 3, -24);
      scene.add(plume);
    }
  }

  private enterCave(): void {
    const data = PLANET_BY_ID[this.currentPlanet];
    const firstVisit = !this.caves.has(this.currentPlanet);
    this.caves.add(this.currentPlanet);
    this.save();
    this.clearCave();
    if (this.surfaceScene) this.surfaceScene.remove(this.chopper.group);
    this.mode = "cave";
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x14111c);
    scene.fog = new THREE.Fog(0x14111c, 13, 25);
    this.caveScene = scene;
    scene.add(new THREE.HemisphereLight(0xffd7a1, 0x251b35, 1.5));
    const lamp = new THREE.PointLight(0xffb85c, 95, 22, 1.7);
    lamp.position.set(-2, 4, -2);
    lamp.castShadow = this.quality === "high";
    scene.add(lamp);
    const cool = new THREE.PointLight(data.color, 18, 16, 1.8);
    cool.position.set(3, 2, 2);
    scene.add(cool);

    const wall = new THREE.Mesh(new THREE.SphereGeometry(9, 36, 22), new THREE.MeshStandardMaterial({ color: new THREE.Color(data.ground).multiplyScalar(0.45), roughness: 1, side: THREE.BackSide }));
    wall.scale.set(1, 0.7, 1);
    wall.position.y = 2.4;
    scene.add(wall);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(8, 48), new THREE.MeshStandardMaterial({ color: 0x594a4c, roughness: 0.96 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const rug = new THREE.Mesh(new THREE.CircleGeometry(2.1, 32), new THREE.MeshStandardMaterial({ color: 0xcf5d83, roughness: 0.9 }));
    rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.015, 0); scene.add(rug);

    const bed = new THREE.Group();
    const bedBase = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.45, 1.55), new THREE.MeshStandardMaterial({ color: 0x6e472f, roughness: 0.85 }));
    bedBase.position.y = 0.3; bed.add(bedBase);
    const blanket = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.25, 1.42), new THREE.MeshStandardMaterial({ color: 0xef77a9, roughness: 0.9 }));
    blanket.position.set(0.2, 0.63, 0); bed.add(blanket);
    const pillow = new THREE.Mesh(new THREE.SphereGeometry(0.5, 18, 10), new THREE.MeshStandardMaterial({ color: 0xfff1d3, roughness: 0.9 }));
    pillow.scale.set(1.1, 0.35, 0.85); pillow.position.set(-0.9, 0.79, 0); bed.add(pillow);
    bed.position.set(-3.8, 0, -1.5); bed.rotation.y = 0.3; scene.add(bed);

    const table = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.9, 0.75, 12), new THREE.MeshStandardMaterial({ color: 0x8b603a, roughness: 0.85 }));
    table.position.set(2.9, 0.38, 2.4); scene.add(table);
    const bookColors = [0x4fa5d8, 0xf2bd4c, 0x6cc79a];
    for (let i = 0; i < 3; i++) {
      const book = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.12, 0.6), new THREE.MeshStandardMaterial({ color: bookColors[i], roughness: 0.8 }));
      book.position.set(2.9, 0.82 + i * 0.13, 2.4); book.rotation.y = i * 0.18; scene.add(book);
    }
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 10), new THREE.MeshBasicMaterial({ color: 0xffd277 }));
    lantern.position.set(-2, 3.7, -2); scene.add(lantern);
    const title = createLabelSprite(`${data.name} · 洞穴营地`, "#ffd277");
    title.position.set(0, 3.9, -5.8); title.scale.multiplyScalar(0.65); scene.add(title);
    const exitGlow = new THREE.Mesh(new THREE.CircleGeometry(1.5, 32), new THREE.MeshBasicMaterial({ color: data.sky, transparent: true, opacity: 0.55 }));
    exitGlow.position.set(0, 1.5, 6.7); exitGlow.rotation.y = Math.PI; scene.add(exitGlow);

    const flagBase = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.15, 0.28, 24), new THREE.MeshStandardMaterial({ color: this.learnedCount() === 3 ? 0xffd166 : 0x6d6a78, emissive: this.learnedCount() === 3 ? 0x6b4a12 : 0x000000, emissiveIntensity: 1.2 }));
    flagBase.position.set(2.7, 0.14, -2.7); scene.add(flagBase);
    const flagLabel = createLabelSprite(this.flags.has(this.currentPlanet) ? "旗帜已飘扬" : "知识旗座", "#ffd166", true);
    flagLabel.position.set(2.7, 1.1, -3.7); flagLabel.scale.multiplyScalar(0.7); scene.add(flagLabel);
    const flag = createPirateFlag();
    flag.group.position.set(2.7, 0.25, -2.7);
    flag.group.scale.setScalar(0.9);
    flag.group.visible = this.flags.has(this.currentPlanet);
    scene.add(flag.group);
    this.caveFlag = flag.group;
    this.surfaceFlag = flag;

    this.chopper.group.position.set(0, 0, 3.3);
    this.chopper.group.rotation.set(0, 0, 0);
    scene.add(this.chopper.group);
    this.cameraYaw = 0;
    this.cameraPitch = 0.22;
    this.nearest = null;
    if (firstVisit) this.dialog = { kind: "notice", planetId: data.id, title: "发现天然洞穴营地", tag: "科学卡 · 想象边界", body: data.caveStatus };
    else this.toastMessage("回到温暖的洞穴营地，体力与护盾已恢复");
    this.shield = 100;
    this.audio.sfx("pickup");
    this.emitUI();
  }

  private launch(): void {
    if (this.mode === "cave") { this.buildSurface(this.currentPlanet); return; }
    if (this.mode !== "surface") return;
    const id = this.currentPlanet;
    const visual = this.planets.get(id)!;
    this.clearCave();
    this.clearSurface();
    this.mode = "space";
    this.solarScene.add(this.shipRig);
    const radial = this.tmpA.copy(visual.group.position).setY(0).normalize();
    this.shipRig.position.copy(visual.group.position).addScaledVector(radial, PLANET_BY_ID[id].radius + 5).setY(0.7);
    this.shipYaw = Math.atan2(-radial.x, -radial.z);
    this.shipRig.rotation.set(0, this.shipYaw, 0);
    this.shipSpeed = 5;
    this.engineGlow.visible = true;
    this.targetPlanet = id;
    this.autopilot = false;
    this.cameraYaw = 0;
    this.toastMessage("返回太空！选择下一颗星球，或自由驾驶");
    this.updateSelectionRing();
    this.emitUI();
  }

  private learnedCount(id = this.currentPlanet): number { return this.learned[id]?.length ?? 0; }

  private activeScene(): THREE.Scene {
    return this.mode === "space" ? this.solarScene : this.mode === "surface" ? this.surfaceScene! : this.caveScene!;
  }

  update(dt: number): void {
    if (this.disposed) return;
    this.visualTime += dt;
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toast = "";
    }
    if (this.input.consumeAction("KeyM")) this.toggleMute();
    if (this.input.consumeAction("Escape") || this.input.consumeAction("KeyP")) {
      if (this.dialog) this.closeDialog(); else this.togglePause();
    }
    if (this.fsm.is("title")) {
      if (this.input.consumeAction("Space")) this.start();
      this.titleOrbit += dt * 0.035;
      this.emitThrottled(dt);
      return;
    }
    if (this.fsm.is("gameover")) {
      if (this.input.consumeAction("Space")) this.restart();
      this.emitThrottled(dt);
      return;
    }
    if (this.fsm.is("victory")) {
      if (this.input.consumeAction("Space")) this.restart();
      this.emitThrottled(dt);
      return;
    }
    if (this.fsm.is("paused")) { this.emitThrottled(dt); return; }

    if (this.dialog) {
      if (this.dialog.kind === "quiz") {
        for (let i = 0; i < 3; i++) if (this.input.consumeAction(`Digit${i + 1}`)) this.answer(i);
      } else if (this.input.consumeAction("Enter") || this.input.consumeAction("Space")) this.advanceDialog();
      this.emitThrottled(dt);
      return;
    }

    this.elapsed += dt;
    this.scanEnergy = Math.min(100, this.scanEnergy + dt * 7);
    this.scannerTimer = Math.max(0, this.scannerTimer - dt);
    this.collisionCooldown = Math.max(0, this.collisionCooldown - dt);
    if (this.input.consumeAction("KeyQ")) this.scan();
    if (this.input.consumeAction("KeyE")) this.interact();
    if (this.input.consumeAction("KeyL")) this.launch();

    if (this.mode === "space") this.updateSpace(dt);
    else this.updateWalking(dt);
    this.updatePrompt();
    this.emitThrottled(dt);
  }

  private updateSpace(dt: number): void {
    const look = this.input.consumeLook();
    this.cameraYaw += look.yaw;
    this.cameraPitch = clamp(this.cameraPitch + look.pitch, -0.05, 0.8);
    const manual = Math.abs(this.input.moveX) > 0.05 || Math.abs(this.input.moveZ) > 0.05;
    if (manual) this.autopilot = false;

    let targetSpeed = 6;
    if (this.input.moveZ > 0) targetSpeed = 22;
    if (this.input.moveZ < 0) targetSpeed = 0;
    if (this.input.actions.has("ShiftLeft") || this.input.actions.has("ShiftRight")) targetSpeed = 34;
    if (this.autopilot) {
      const visual = this.planets.get(this.targetPlanet)!;
      const radial = this.tmpA.copy(visual.group.position).setY(0).normalize();
      const destination = this.tmpB.copy(visual.group.position).addScaledVector(radial, PLANET_BY_ID[this.targetPlanet].radius + 4.5);
      const toTarget = this.tmpC.copy(destination).sub(this.shipRig.position);
      const distance = toTarget.length();
      if (distance < 1.2) {
        this.autopilot = false;
        this.shipSpeed = 0;
        this.currentPlanet = this.targetPlanet;
        this.toastMessage(`已抵达${PLANET_BY_ID[this.targetPlanet].name}轨道，按 E 着陆`);
      } else {
        const desiredYaw = Math.atan2(-toTarget.x, -toTarget.z);
        this.shipYaw = approachAngle(this.shipYaw, desiredYaw, 3.2, dt);
        targetSpeed = clamp(distance * 0.8, 3, 26);
        if (distance < 6) targetSpeed = clamp(distance * 0.55, 1.8, 5);
      }
    } else {
      this.shipYaw -= this.input.moveX * dt * (1.25 + this.shipSpeed * 0.014);
    }
    this.shipSpeed = damp(this.shipSpeed, targetSpeed, this.autopilot ? 2.4 : 2, dt);
    const forward = this.tmpA.set(-Math.sin(this.shipYaw), 0, -Math.cos(this.shipYaw));
    this.shipRig.position.addScaledVector(forward, this.shipSpeed * dt);
    this.shipRig.position.y = 0.65 + Math.sin(this.visualTime * 2.2) * 0.08;
    this.shipRig.rotation.y = this.shipYaw;
    this.shipRig.rotation.z = damp(this.shipRig.rotation.z, -this.input.moveX * 0.2, 5, dt);
    this.engineGlow.scale.y = 0.45 + this.shipSpeed / 16;
    this.engineGlow.visible = true;

    const distanceFromSun = this.shipRig.position.length();
    if (distanceFromSun < 9) {
      this.damage(100);
      this.shipRig.position.setLength(13);
    } else if (distanceFromSun > 132) {
      const toCenter = this.tmpB.copy(this.shipRig.position).multiplyScalar(-1);
      this.shipYaw = approachAngle(this.shipYaw, Math.atan2(-toCenter.x, -toCenter.z), 1.8, dt);
      if (distanceFromSun > 145) this.shipRig.position.setLength(140);
    }
    if (this.collisionCooldown <= 0 && this.shipSpeed > 7) {
      for (let i = 0; i < this.asteroidPositions.length; i++) {
        if (this.shipRig.position.distanceToSquared(this.asteroidPositions[i]) < 2.1) {
          this.damage(20);
          const away = this.tmpB.copy(this.shipRig.position).sub(this.asteroidPositions[i]).normalize();
          this.shipRig.position.addScaledVector(away, 3);
          break;
        }
      }
    }
    this.shield = Math.min(100, this.shield + dt * 0.65);

    let nearestId = "";
    let nearestDistance = Infinity;
    for (const p of PLANETS) {
      const d = this.shipRig.position.distanceTo(this.planets.get(p.id)!.group.position) - p.radius;
      if (d < nearestDistance) { nearestDistance = d; nearestId = p.id; }
    }
    if (nearestDistance < 5.8) {
      this.currentPlanet = nearestId;
      this.nearest = { type: "planet", id: nearestId };
    } else this.nearest = null;
    this.updateSelectionRing();
  }

  private updateWalking(dt: number): void {
    const look = this.input.consumeLook();
    this.cameraYaw += look.yaw;
    this.cameraPitch = clamp(this.cameraPitch + look.pitch, -0.05, 0.75);
    const forward = this.tmpA.set(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw));
    const right = this.tmpB.set(Math.cos(this.cameraYaw), 0, -Math.sin(this.cameraYaw));
    const move = this.tmpC.set(0, 0, 0).addScaledVector(forward, this.input.moveZ).addScaledVector(right, this.input.moveX);
    const amount = Math.min(1, move.length());
    const speed = amount * 5.8;
    if (amount > 0.02) {
      move.normalize();
      this.chopper.group.position.addScaledVector(move, speed * dt);
      const targetYaw = Math.atan2(-move.x, -move.z);
      this.chopper.group.rotation.y = approachAngle(this.chopper.group.rotation.y, targetYaw, 12, dt);
    }
    if (this.mode === "surface") {
      const data = PLANET_BY_ID[this.currentPlanet];
      const length = Math.hypot(this.chopper.group.position.x, this.chopper.group.position.z);
      if (length > 42) {
        this.chopper.group.position.x *= 42 / length;
        this.chopper.group.position.z *= 42 / length;
        this.toastMessage("已到考察区边界，转身继续寻找信标吧");
      }
      this.chopper.group.position.y = this.terrainHeight(this.chopper.group.position.x, this.chopper.group.position.z, data.orbit);
      if (this.scanPulse) {
        this.scanPulse.position.copy(this.chopper.group.position);
        this.scanPulse.position.y += 0.12;
        if (this.scanWave > 0) {
          this.scanWave = Math.max(0, this.scanWave - dt);
          const progress = 1 - this.scanWave / 1.25;
          this.scanPulse.visible = true;
          this.scanPulse.scale.setScalar(1 + progress * 32);
          (this.scanPulse.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.72;
        } else this.scanPulse.visible = false;
      }
    } else {
      const length = Math.hypot(this.chopper.group.position.x, this.chopper.group.position.z);
      if (length > 6.2) {
        this.chopper.group.position.x *= 6.2 / length;
        this.chopper.group.position.z *= 6.2 / length;
      }
      this.chopper.group.position.y = 0;
    }
    this.chopper.tick(this.visualTime, speed);
  }

  private damage(amount: number): void {
    if (this.collisionCooldown > 0) return;
    this.collisionCooldown = 1.2;
    this.shield = Math.max(0, this.shield - amount);
    this.shipSpeed *= 0.35;
    this.shake = 0.65;
    this.audio.sfx("hit");
    this.toastMessage(`太空碎石碰撞！护盾剩余 ${Math.round(this.shield)}%`);
    if (this.shield <= 0) {
      this.dialog = null;
      this.fsm.transition("gameover");
      this.audio.sfx("lose");
    }
  }

  private updatePrompt(): void {
    this.nearest = null;
    this.prompt = "";
    if (this.mode === "space") {
      let closest: PlanetData | null = null;
      let closestDistance = Infinity;
      for (const p of PLANETS) {
        const d = this.shipRig.position.distanceTo(this.planets.get(p.id)!.group.position) - p.radius;
        if (d < closestDistance) { closestDistance = d; closest = p; }
      }
      if (closest && closestDistance < 5.8) {
        this.nearest = { type: "planet", id: closest.id };
        this.prompt = `E · 登陆${closest.landingShort}`;
      } else this.prompt = this.autopilot ? `自动导航至${PLANET_BY_ID[this.targetPlanet].name} · WASD 可接管` : "W 加速 · S 刹车 · A/D 转向 · 点击星球可导航";
      this.objective = this.flags.size === 8 ? "八面旗帜已集齐 · 自由探索" : `星际任务：已插上 ${this.flags.size} / 8 面旗帜`;
      const target = this.planets.get(this.targetPlanet)!.group.position;
      this.targetDistance = this.shipRig.position.distanceTo(target);
      this.updateBearing(target);
      return;
    }

    if (this.mode === "surface") {
      const player = this.chopper.group.position;
      let bestDistance = Infinity;
      for (let i = 0; i < this.beaconPositions.length; i++) {
        const d = player.distanceTo(this.beaconPositions[i]);
        if (d < 3.2 && d < bestDistance) { bestDistance = d; this.nearest = { type: "beacon", index: i }; }
      }
      const caveDistance = player.distanceTo(this.cavePosition);
      if (caveDistance < 4.4 && caveDistance < bestDistance) { bestDistance = caveDistance; this.nearest = { type: "cave" }; }
      const shipDistance = player.distanceTo(this.shipRig.position);
      if (shipDistance < 4 && shipDistance < bestDistance) this.nearest = { type: "ship" };
      if (this.nearest?.type === "beacon") {
        const index = this.nearest.index!;
        this.prompt = `E · ${this.learned[this.currentPlanet].includes(index) ? "复习" : "学习"}《${PLANET_BY_ID[this.currentPlanet].lessons[index].title}》`;
      } else if (this.nearest?.type === "cave") this.prompt = "E · 进入天然洞穴营地";
      else if (this.nearest?.type === "ship") this.prompt = "E · 驾驶飞船返回太空";
      else this.prompt = "WASD 移动 · Q 扫描 · 拖动视角";

      if (this.learnedCount() < 3) {
        let targetIndex = 0;
        let min = Infinity;
        for (let i = 0; i < 3; i++) if (!this.learned[this.currentPlanet].includes(i)) {
          const d = player.distanceTo(this.beaconPositions[i]);
          if (d < min) { min = d; targetIndex = i; }
        }
        this.objective = `${this.scannerTimer > 0 ? "扫描锁定" : "寻找"}知识信标 ${targetIndex + 1} · ${this.learnedCount()} / 3`;
        this.targetDistance = min;
        this.updateBearing(this.beaconPositions[targetIndex]);
      } else {
        this.objective = this.flags.has(this.currentPlanet) ? "旗帜已插好 · 返回太空探索下一颗星球" : "知识集齐！前往天然洞穴插上旗帜";
        this.targetDistance = caveDistance;
        this.updateBearing(this.cavePosition);
      }
      return;
    }

    const player = this.chopper.group.position;
    const flagPos = this.tmpA.set(2.7, 0, -2.7);
    const exitPos = this.tmpB.set(0, 0, 6.1);
    const flagDistance = player.distanceTo(flagPos);
    const exitDistance = player.distanceTo(exitPos);
    if (flagDistance < 2.6) { this.nearest = { type: "flag" }; this.prompt = this.flags.has(this.currentPlanet) ? "E · 查看海贼王旗帜" : "E · 在知识旗座插旗"; }
    else if (exitDistance < 2.4) { this.nearest = { type: "exit" }; this.prompt = "E · 离开洞穴返回地表"; }
    else this.prompt = "WASD 移动 · 这是你的安全营地";
    if (this.flags.has(this.currentPlanet)) this.objective = "营地已点亮 · 去洞口返回地表";
    else if (this.learnedCount() === 3) { this.objective = "走到发光旗座，插上本星球的旗帜"; this.targetDistance = flagDistance; this.updateBearing(flagPos); }
    else this.objective = `还需 ${3 - this.learnedCount()} 张知识卡才能插旗 · 可先去休息`;
  }

  private updateBearing(target: THREE.Vector3): void {
    const origin = this.mode === "space" ? this.shipRig.position : this.chopper.group.position;
    const dir = this.tmpC.copy(target).sub(origin).setY(0);
    if (dir.lengthSq() < 0.001) { this.bearing = 0; return; }
    dir.normalize();
    const yaw = this.mode === "space" ? this.shipYaw : this.cameraYaw;
    const forwardX = -Math.sin(yaw), forwardZ = -Math.cos(yaw);
    const rightX = Math.cos(yaw), rightZ = -Math.sin(yaw);
    this.bearing = Math.atan2(dir.x * rightX + dir.z * rightZ, dir.x * forwardX + dir.z * forwardZ);
  }

  interact(): void {
    if (!this.fsm.is("playing") || this.dialog) return;
    this.updatePrompt();
    if (!this.nearest) { this.toastMessage("靠近发光目标后再互动"); return; }
    if (this.nearest.type === "planet" && this.nearest.id) this.buildSurface(this.nearest.id);
    else if (this.nearest.type === "beacon") this.openLesson(this.nearest.index!);
    else if (this.nearest.type === "cave") this.enterCave();
    else if (this.nearest.type === "ship") this.launch();
    else if (this.nearest.type === "exit") this.launch();
    else if (this.nearest.type === "flag") {
      if (this.flags.has(this.currentPlanet)) this.dialog = { kind: "notice", title: "海贼王旗帜正在飘扬", body: "这面旗代表你完成了这里的全部知识挑战。继续向下一颗星球出发吧！" };
      else if (this.learnedCount() < 3) this.dialog = { kind: "notice", title: "旗座还没有点亮", body: `还需要完成 ${3 - this.learnedCount()} 张知识卡。回到地表寻找发光的知识信标，答对每张小题后再来插旗。` };
      else this.plantFlag();
    }
    this.emitUI();
  }

  scan(): void {
    if (!this.fsm.is("playing") || this.dialog || this.mode === "space") return;
    if (this.scanEnergy < 25) { this.toastMessage("扫描能量恢复中，请稍等几秒"); this.audio.sfx("ui"); return; }
    this.scanEnergy -= 25;
    this.scannerTimer = 6;
    this.scanWave = 1.25;
    this.audio.sfx("pickup");
    if (this.mode === "surface") this.toastMessage(this.learnedCount() < 3 ? "扫描完成：跟随罗盘寻找知识信标" : "扫描完成：天然洞穴方向已标记");
    else this.toastMessage("营地很安全：发光旗座与出口已标记");
  }

  private openLesson(index: number): void {
    const data = PLANET_BY_ID[this.currentPlanet];
    const item = data.lessons[index];
    this.dialog = { kind: "lesson", planetId: data.id, lessonIndex: index, title: item.title, tag: item.tag, body: item.body };
    this.audio.sfx("ui");
  }

  answer(choice: number): void {
    if (this.dialog?.kind !== "quiz" || this.dialog.planetId === undefined || this.dialog.lessonIndex === undefined) return;
    const data = PLANET_BY_ID[this.dialog.planetId];
    const index = this.dialog.lessonIndex;
    const item = data.lessons[index];
    if (choice === item.answer) {
      if (!this.learned[data.id].includes(index)) this.learned[data.id].push(index);
      this.save();
      const beacon = this.beacons[index];
      if (beacon && this.mode === "surface") beacon.traverse((obj) => {
        if (obj.name === "crystal" && obj instanceof THREE.Mesh) {
          const mat = obj.material as THREE.MeshStandardMaterial;
          mat.color.set(0x71e6b1); mat.emissive.set(0x71e6b1);
        }
      });
      this.audio.sfx("pickup");
      const complete = this.learnedCount(data.id) === 3;
      this.dialog = {
        kind: "result", planetId: data.id, lessonIndex: index, title: complete ? "三张知识卡集齐了！" : "回答正确，知识 +1",
        tag: `${this.learnedCount(data.id)} / 3 知识卡`, body: item.explanation,
        explanation: complete ? "天然洞穴里的知识旗座已点亮。去营地插旗吧！" : "继续寻找下一个发光的知识信标。",
      };
    } else {
      this.dialog = { ...this.dialog, wrongChoice: choice, explanation: "再想一想知识卡里的线索，你可以再试一次。" };
      this.audio.sfx("ui");
    }
    this.emitUI();
  }

  advanceDialog(): void {
    if (!this.dialog) return;
    if (this.dialog.kind === "lesson") {
      const data = PLANET_BY_ID[this.dialog.planetId!];
      const index = this.dialog.lessonIndex!;
      if (this.learned[data.id].includes(index)) this.dialog = null;
      else {
        const item = data.lessons[index];
        this.dialog = { kind: "quiz", planetId: data.id, lessonIndex: index, title: "乔巴的知识挑战", question: item.question, options: item.options, tag: item.title };
      }
    } else if (this.dialog.kind === "flag") {
      this.dialog = null;
      if (this.flags.size === 8 && !this.fsm.is("victory")) {
        this.fsm.transition("victory");
        this.audio.sfx("win");
      }
    } else if (this.dialog.kind !== "quiz") this.dialog = null;
    this.audio.sfx("ui");
    this.emitUI();
  }

  closeDialog(): void {
    this.dialog = null;
    this.emitUI();
  }

  private plantFlag(): void {
    const id = this.currentPlanet;
    this.flags.add(id);
    if (this.caveFlag) this.caveFlag.visible = true;
    const badge = this.flagBadges.get(id);
    if (badge) badge.visible = true;
    this.save();
    this.audio.sfx("win");
    this.shake = 0.25;
    this.dialog = {
      kind: "flag", planetId: id, title: `${PLANET_BY_ID[id].name}旗帜，插旗成功！`,
      tag: `${this.flags.size} / 8 面海贼旗`,
      body: this.flags.size === 8 ? "八面旗帜全部集齐！乔巴的太阳系知识航海团可以毕业啦！" : `你已经掌握${PLANET_BY_ID[id].name}的三张知识卡。下一站，继续把知识与勇气带到新的世界！`,
    };
  }

  travel(id: string): void {
    if (!VALID_IDS.has(id) || !this.fsm.is("playing")) return;
    if (this.mode !== "space") { this.toastMessage("请先返回太空，再选择下一颗星球"); return; }
    this.dialog = null;
    this.targetPlanet = id;
    this.autopilot = true;
    this.updateSelectionRing();
    this.toastMessage(`自动导航：${PLANET_BY_ID[id].name} · 抵达后按 E 着陆`);
    this.audio.sfx("ui");
    this.emitUI();
  }

  start(fresh = false): void {
    if (!this.fsm.is("title")) return;
    if (fresh) this.resetProgress();
    this.fsm.transition("playing");
    this.audio.startMusic();
    this.toastMessage("欢迎上船！点击星球自动导航，W 加速、S 刹车、A/D 转向");
    this.emitUI();
  }

  togglePause(): void {
    if (this.fsm.is("playing")) this.fsm.transition("paused");
    else if (this.fsm.is("paused")) this.fsm.transition("playing");
    else return;
    this.dialog = null;
    this.audio.sfx("ui");
    this.emitUI();
  }

  returnTitle(): void {
    if (this.mode !== "space") this.launch();
    if (!this.fsm.is("title")) this.fsm.transition("title");
    this.dialog = null;
    this.autopilot = false;
    this.audio.stopMusic();
    this.emitUI();
  }

  restart(): void {
    if (!this.fsm.is("gameover", "victory")) return;
    this.fsm.transition("playing");
    this.shield = 100;
    this.dialog = null;
    if (this.mode !== "space") this.launch();
    const visual = this.planets.get(this.currentPlanet) ?? this.planets.get("earth")!;
    this.shipRig.position.copy(visual.group.position).add(new THREE.Vector3(0, 0.7, PLANET_BY_ID[this.currentPlanet].radius + 6));
    this.shipSpeed = 0;
    this.autopilot = false;
    this.toastMessage(this.flags.size === 8 ? "毕业后的自由探索开始！" : "救援完成，飞船护盾已恢复");
    this.audio.startMusic();
    this.emitUI();
  }

  toggleMute(): void {
    this.audio.toggleMute();
    this.save();
    this.emitUI();
  }

  resetProgress(): void {
    this.learned = Object.fromEntries(PLANETS.map((p) => [p.id, []]));
    this.caves.clear();
    this.flags.clear();
    this.hasLanded.clear();
    for (const badge of this.flagBadges.values()) badge.visible = false;
    storage.remove(SAVE_KEY);
    this.dialog = null;
    this.toastMessage("新的学习航海日志已准备好");
    this.emitUI();
  }

  setQuality(quality: QualityLevel): void {
    this.quality = quality;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality === "high" ? 1.75 : 1));
    this.renderer.shadowMap.enabled = quality === "high";
    this.save();
    this.toastMessage(quality === "high" ? "已切换精美画质" : "已切换流畅画质");
    this.emitUI();
  }

  private toastMessage(message: string): void {
    this.toast = message;
    this.toastTimer = 4.2;
  }

  pickPlanet(clientX: number, clientY: number): void {
    if (!this.fsm.is("playing") || this.mode !== "space" || this.dialog) return;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects([...this.planets.values()].map((p) => p.mesh), false);
    if (hits.length) {
      const id = hits[0].object.userData.planetId as string;
      this.travel(id);
    }
  }

  render(): void {
    if (this.disposed) return;
    const now = performance.now();
    const frameMs = Math.max(1, now - this.lastRenderTime);
    this.lastRenderTime = now;
    this.fps += (clamp(1000 / frameMs, 1, 144) - this.fps) * 0.08;
    this.shake = Math.max(0, this.shake - frameMs / 900);

    for (const visual of this.planets.values()) visual.mesh.rotation.y += 0.0007 * visual.spin * frameMs;
    if (this.fsm.is("title")) {
      const r = 132;
      this.camera.position.set(Math.sin(this.titleOrbit) * r + 14, 84, Math.cos(this.titleOrbit) * r);
      this.camera.lookAt(4, 0, 0);
    } else if (this.mode === "space") {
      const viewYaw = this.shipYaw + this.cameraYaw;
      const forward = this.tmpA.set(-Math.sin(viewYaw), 0, -Math.cos(viewYaw));
      const distance = 9 + this.shipSpeed * 0.07;
      this.camera.position.copy(this.shipRig.position).addScaledVector(forward, -distance);
      this.camera.position.y += 4.2 + this.cameraPitch * 6;
      this.tmpB.copy(this.shipRig.position).addScaledVector(forward, 4.5);
      this.tmpB.y += 0.8;
      this.camera.lookAt(this.tmpB);
    } else {
      const forward = this.tmpA.set(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw));
      const distance = this.mode === "cave" ? 5.2 : 7;
      this.camera.position.copy(this.chopper.group.position).addScaledVector(forward, -distance);
      this.camera.position.y += (this.mode === "cave" ? 3.1 : 3.8) + this.cameraPitch * 4;
      this.tmpB.copy(this.chopper.group.position);
      this.tmpB.y += 1.4;
      this.camera.lookAt(this.tmpB);
    }
    if (this.shake > 0) {
      this.camera.position.x += Math.sin(this.visualTime * 79) * this.shake * 0.22;
      this.camera.position.y += Math.cos(this.visualTime * 91) * this.shake * 0.14;
    }
    if (this.mode === "surface") {
      for (let i = 0; i < this.beacons.length; i++) {
        const beacon = this.beacons[i];
        const crystal = beacon.getObjectByName("crystal");
        const ring = beacon.getObjectByName("ring");
        const beam = beacon.getObjectByName("beam");
        const label = beacon.getObjectByName("label");
        if (crystal) { crystal.rotation.y = this.visualTime * 1.3 + i; crystal.position.y = 1.9 + Math.sin(this.visualTime * 2 + i) * 0.16; }
        if (ring) ring.rotation.z = this.visualTime * 0.8;
        if (beam) beam.visible = this.scannerTimer > 0 || this.chopper.group.position.distanceToSquared(this.beaconPositions[i]) < 130;
        if (label) label.visible = this.scannerTimer > 0 || this.chopper.group.position.distanceToSquared(this.beaconPositions[i]) < 200;
      }
    }
    if (this.surfaceFlag && this.mode !== "space") this.surfaceFlag.tick(this.visualTime);
    this.renderer.render(this.activeScene(), this.camera);
  }

  resize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
  }

  private emitThrottled(dt: number): void {
    this.uiTimer -= dt;
    if (this.uiTimer <= 0) { this.uiTimer = 0.2; this.emitUI(); }
  }

  private emitUI(): void { this.onUI(this.getSnapshot()); }

  getSnapshot(): UIState {
    const hasSave = this.flags.size > 0 || this.caves.size > 0 || PLANETS.some((p) => this.learned[p.id].length > 0);
    return {
      ready: this.ready,
      screen: this.fsm.state,
      mode: this.mode,
      currentPlanet: this.currentPlanet,
      targetPlanet: this.targetPlanet,
      learned: Object.fromEntries(PLANETS.map((p) => [p.id, [...this.learned[p.id]]])),
      caves: [...this.caves],
      flags: [...this.flags],
      shield: Math.round(this.shield),
      scan: Math.round(this.scanEnergy),
      speed: Math.round(this.shipSpeed * 10) / 10,
      muted: this.audio.muted,
      quality: this.quality,
      prompt: this.prompt,
      objective: this.objective,
      targetDistance: Math.round(this.targetDistance),
      bearing: this.bearing,
      scannerActive: this.scannerTimer > 0,
      dialog: this.dialog,
      toast: this.toast,
      hasSave,
      elapsed: this.elapsed,
      fps: Math.round(this.fps),
      drawCalls: this.renderer.info.render.calls,
    };
  }

  getHandle(): GameHandle {
    return {
      start: (fresh = false) => this.start(fresh),
      togglePause: () => this.togglePause(),
      returnTitle: () => this.returnTitle(),
      restart: () => this.restart(),
      travel: (id) => this.travel(id),
      interact: () => this.interact(),
      scan: () => this.scan(),
      launch: () => this.launch(),
      answer: (choice) => this.answer(choice),
      advanceDialog: () => this.advanceDialog(),
      closeDialog: () => this.closeDialog(),
      toggleMute: () => this.toggleMute(),
      resetProgress: () => this.resetProgress(),
      setQuality: (quality) => this.setQuality(quality),
      setVirtualMove: (x, z) => this.input.setVirtualMove(x, z),
      getSnapshot: () => this.getSnapshot(),
    };
  }

  getTestApi(): Record<string, unknown> {
    return {
      snapshot: () => this.getSnapshot(),
      land: (id: string) => { if (this.fsm.is("title")) this.start(); this.buildSurface(id); this.dialog = null; },
      closeDialog: () => { this.dialog = null; },
      teleportToBeacon: (index: number) => { if (this.mode === "surface") this.chopper.group.position.copy(this.beaconPositions[index]).add(new THREE.Vector3(0, 0, 2)); this.updatePrompt(); },
      teleportToCave: () => { if (this.mode === "surface") this.chopper.group.position.copy(this.cavePosition).add(new THREE.Vector3(0, 0, 3)); this.updatePrompt(); },
      teleportToFlag: () => { if (this.mode === "cave") this.chopper.group.position.set(2.7, 0, -0.8); this.updatePrompt(); },
      teleportToShip: () => { if (this.mode === "surface") this.chopper.group.position.copy(this.shipRig.position).add(new THREE.Vector3(0, -1, 2.5)); this.updatePrompt(); },
      completeLessons: (id: string) => { this.learned[id] = [0, 1, 2]; this.save(); this.emitUI(); },
      setSpace: () => { if (this.mode !== "space") this.launch(); },
      rescue: () => { if (this.fsm.is("playing")) { this.shield = 0; this.fsm.transition("gameover"); this.emitUI(); } },
      probe: () => ({ x: this.mode === "space" ? this.shipRig.position.x : this.chopper.group.position.x, y: this.mode === "space" ? this.shipRig.position.y : this.chopper.group.position.y, z: this.mode === "space" ? this.shipRig.position.z : this.chopper.group.position.z, mode: this.mode, screen: this.fsm.state }),
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.input.dispose();
    this.audio.dispose();
    this.solarScene.remove(this.shipRig);
    this.surfaceScene?.remove(this.shipRig);
    this.surfaceScene?.remove(this.chopper.group);
    this.caveScene?.remove(this.chopper.group);
    disposeObject(this.solarScene);
    if (this.surfaceScene) disposeObject(this.surfaceScene);
    if (this.caveScene) disposeObject(this.caveScene);
    disposeObject(this.shipRig);
    disposeObject(this.chopper.group);
    if (this.shipAssetDispose) void this.shipAssetDispose();
    this.renderer.dispose();
  }
}
