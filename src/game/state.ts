import type { GameScreen } from "./types";

const TRANSITIONS: Record<GameScreen, readonly GameScreen[]> = {
  title: ["playing"],
  playing: ["paused", "gameover", "victory", "title"],
  paused: ["playing", "title"],
  gameover: ["playing", "title"],
  victory: ["playing", "title"],
};

export class GameStateMachine {
  private _state: GameScreen = "title";
  private listeners = new Set<(s: GameScreen, prev: GameScreen) => void>();

  get state(): GameScreen { return this._state; }
  is(...states: GameScreen[]): boolean { return states.includes(this._state); }

  transition(next: GameScreen): void {
    const prev = this._state;
    if (prev === next) return;
    if (!TRANSITIONS[prev].includes(next)) throw new Error(`illegal state transition: ${prev} -> ${next}`);
    this._state = next;
    for (const fn of this.listeners) fn(next, prev);
  }

  onChange(fn: (s: GameScreen, prev: GameScreen) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}
