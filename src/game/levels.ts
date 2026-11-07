export type PlatformKind = "normal" | "moving" | "bounce" | "crumble";
export type HazardKind = "spikes" | "sweeper" | "slime" | "laser";

export interface PlatformSpec {
  x: number; y: number; z: number; w: number; h: number; d: number;
  kind?: PlatformKind; axis?: "x" | "y"; range?: number; speed?: number; phase?: number;
}
export interface HazardSpec {
  kind: HazardKind; x: number; y: number; z: number; w?: number; d?: number;
  length?: number; speed?: number; phase?: number;
}
export interface PointSpec { x: number; y: number; z: number }
export interface LevelDefinition {
  id: number; name: string; subtitle: string; description: string; difficulty: string;
  icon: string; colors: { sky: number; fog: number; platform: number; top: number; accent: number };
  spawn: PointSpec; goal: PointSpec; platforms: PlatformSpec[]; hazards: HazardSpec[];
  stars: PointSpec[]; checkpoints: PointSpec[];
}

const p = (x: number, y: number, z: number, w: number, d: number, extra: Partial<PlatformSpec> = {}): PlatformSpec =>
  ({ x, y, z, w, d, h: 1, ...extra });
const s = (x: number, y: number, z: number): PointSpec => ({ x, y, z });
const h = (kind: HazardKind, x: number, y: number, z: number, extra: Partial<HazardSpec> = {}): HazardSpec =>
  ({ kind, x, y, z, ...extra });

export const LEVELS: LevelDefinition[] = [
  {
    id: 0, name: "晨光草原", subtitle: "第一站 · 学会奔跑与跳跃", difficulty: "轻松", icon: "🌿",
    description: "跟着星星穿过软软的草甸，认识尖刺、弹板和移动平台。",
    colors: { sky: 0xbfe9ff, fog: 0xdff5ef, platform: 0x8fcba7, top: 0xc8f2b6, accent: 0xffcf5c },
    spawn: s(0, 0.05, 5), goal: s(0, 1, -96),
    platforms: [
      p(0, -0.5, 4, 8, 12), p(0, -0.5, -10, 6, 10), p(1.5, 0, -22, 5, 8),
      p(-1, 0.5, -34, 5, 8), p(0, 0, -46, 8, 10),
      p(0, 0, -59, 4, 6, { kind: "moving", axis: "x", range: 2.2, speed: 1.1 }),
      p(0, 0, -71, 7, 10), p(2, 0.5, -84, 5, 8, { kind: "bounce" }), p(0, 0, -96, 10, 12),
    ],
    hazards: [h("spikes", -1.8, 0.55, -45, { w: 1.6, d: 2 }), h("spikes", 1.5, 0.55, -72, { w: 1.4, d: 2 }), h("slime", -1.8, 0.53, -10, { w: 2, d: 2.4 })],
    stars: [s(0, 1.2, 0), s(0, 1.2, -7), s(0, 1.5, -14), s(1.5, 2, -21), s(-1, 2.5, -33), s(0, 2, -43), s(0, 2, -49), s(0, 2.2, -59), s(0, 2, -68), s(0, 2, -75), s(2, 3, -84), s(0, 2, -94)],
    checkpoints: [s(2.4, 0.55, -46), s(-2, 0.55, -71)],
  },
  {
    id: 1, name: "云朵工厂", subtitle: "第二站 · 跟上平台的节拍", difficulty: "进阶", icon: "☁️",
    description: "在漂浮工厂里弹跳，躲开旋转扫杆和周期激光。",
    colors: { sky: 0xa9c8ff, fog: 0xe3dcff, platform: 0x8f9ed8, top: 0xd7dcff, accent: 0xff8fa3 },
    spawn: s(0, 0.05, 5), goal: s(0, 1.5, -116),
    platforms: [
      p(0, -0.5, 4, 8, 12), p(0, 0, -10, 5, 7), p(-2, 0.5, -21, 4, 6, { kind: "moving", axis: "y", range: 1.3, speed: 1.2 }),
      p(1, 1, -32, 5, 7, { kind: "crumble" }), p(0, 0.5, -43, 8, 8),
      p(0, 0.5, -55, 4, 6, { kind: "moving", axis: "x", range: 3, speed: 1.45 }),
      p(0, 0.5, -67, 6, 7, { kind: "bounce" }), p(-2, 1, -80, 5, 7),
      p(1.5, 1, -91, 4, 6, { kind: "moving", axis: "y", range: 1.4, speed: 1.5, phase: 1 }),
      p(0, 1, -103, 6, 7, { kind: "crumble" }), p(0, 0.5, -116, 10, 12),
    ],
    hazards: [h("sweeper", 0, 1.05, -43, { length: 6, speed: 1.3 }), h("laser", 0, 1.1, -78, { w: 5, d: 0.5, speed: 1.7 }), h("spikes", 1, 1.55, -103, { w: 1.4, d: 1.6 })],
    stars: [s(0, 1.2, 0), s(0, 1.8, -10), s(-2, 3, -21), s(1, 3, -32), s(-2, 2.5, -43), s(2, 2.5, -43), s(0, 2.8, -55), s(0, 3, -67), s(-2, 3, -80), s(1.5, 4, -91), s(0, 3, -103), s(0, 3, -114)],
    checkpoints: [s(2.7, 1.05, -46), s(-2, 1.55, -80)],
  },
  {
    id: 2, name: "星光古堡", subtitle: "终点站 · 综合运用所有技巧", difficulty: "挑战", icon: "🏰",
    description: "穿过会消失的道路与星光机关，点亮终点传送门。",
    colors: { sky: 0x263765, fog: 0x4b507e, platform: 0x665b91, top: 0xa89bd4, accent: 0x7cf4e1 },
    spawn: s(0, 0.05, 5), goal: s(0, 2, -132),
    platforms: [
      p(0, -0.5, 4, 8, 12), p(0, 0, -10, 5, 7), p(2, 0.5, -21, 4, 6, { kind: "moving", axis: "x", range: 2.5, speed: 1.5 }),
      p(-1, 1, -32, 5, 6, { kind: "crumble" }), p(0, 1.5, -43, 5, 6, { kind: "bounce" }),
      p(0, 1, -56, 8, 8), p(-2, 1, -69, 4, 6, { kind: "moving", axis: "y", range: 1.6, speed: 1.6 }),
      p(1, 1.5, -81, 5, 6), p(0, 1, -93, 7, 7),
      p(0, 1, -105, 4, 6, { kind: "moving", axis: "x", range: 3, speed: 1.75 }), p(-1, 1.5, -117, 5, 6, { kind: "crumble" }),
      p(0, 1, -132, 10, 12),
    ],
    hazards: [
      h("sweeper", 0, 1.6, -56, { length: 6.5, speed: 1.8 }), h("laser", 1, 2.1, -81, { w: 5, d: 0.5, speed: 2 }),
      h("sweeper", 0, 1.6, -93, { length: 5.5, speed: -2.1 }), h("spikes", -2, 1.55, -55, { w: 1.4, d: 1.8 }),
    ],
    stars: [s(0, 1.2, 0), s(0, 1.8, -10), s(2, 3, -21), s(-1, 3.2, -32), s(0, 4, -43), s(2, 3, -56), s(-2, 4, -69), s(1, 3.5, -81), s(-2, 3, -93), s(2, 3, -93), s(0, 4, -105), s(0, 4, -130)],
    checkpoints: [s(2.7, 1.55, -59), s(-2, 1.55, -93)],
  },
];
