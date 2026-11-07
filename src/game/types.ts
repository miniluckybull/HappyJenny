export type GameScreen = "title" | "playing" | "paused" | "gameover" | "victory";
export type GameMode = "space" | "surface" | "cave";
export type QualityLevel = "high" | "low";

export interface DialogState {
  kind: "lesson" | "quiz" | "result" | "notice" | "flag";
  planetId?: string;
  lessonIndex?: number;
  title: string;
  body?: string;
  tag?: string;
  question?: string;
  options?: [string, string, string];
  wrongChoice?: number;
  explanation?: string;
}

export interface UIState {
  ready: boolean;
  screen: GameScreen;
  mode: GameMode;
  currentPlanet: string;
  targetPlanet: string;
  learned: Record<string, number[]>;
  caves: string[];
  flags: string[];
  shield: number;
  scan: number;
  speed: number;
  muted: boolean;
  quality: QualityLevel;
  prompt: string;
  objective: string;
  targetDistance: number;
  bearing: number;
  scannerActive: boolean;
  dialog: DialogState | null;
  toast: string;
  hasSave: boolean;
  elapsed: number;
  fps: number;
  drawCalls: number;
}

export interface SaveData {
  version: number;
  learned: Record<string, number[]>;
  caves: string[];
  flags: string[];
  muted: boolean;
  quality: QualityLevel;
}

export interface GameHandle {
  start: (fresh?: boolean) => void;
  togglePause: () => void;
  returnTitle: () => void;
  restart: () => void;
  travel: (planetId: string) => void;
  interact: () => void;
  scan: () => void;
  launch: () => void;
  answer: (choice: number) => void;
  advanceDialog: () => void;
  closeDialog: () => void;
  toggleMute: () => void;
  resetProgress: () => void;
  setQuality: (quality: QualityLevel) => void;
  setVirtualMove: (x: number, z: number) => void;
  getSnapshot: () => UIState;
}
