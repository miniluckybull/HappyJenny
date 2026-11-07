import { Adventure } from "./adventure";
import { GameLoop } from "./engine";
import type { GameHandle, UIState } from "./types";

declare global {
  interface Window {
    __gameProbe?: () => { x: number; y: number; z: number };
    __GAME_READY__?: boolean;
    __chopperTest?: Record<string, unknown>;
  }
}

let session: { dispose: () => void } | null = null;

export function startGame(canvas: HTMLCanvasElement, onUI: (state: UIState) => void): GameHandle {
  stopGame();
  const adventure = new Adventure(canvas, onUI);
  const handle = adventure.getHandle();
  const loop = new GameLoop({
    update: (dt) => adventure.update(dt),
    render: () => {
      adventure.render();
      if (adventure.ready) window.__GAME_READY__ = true;
    },
  });
  loop.start();

  const onResize = () => adventure.resize();
  let pointerStart = { x: 0, y: 0 };
  const onPointerDown = (event: PointerEvent) => { pointerStart = { x: event.clientX, y: event.clientY }; };
  const onPointerUp = (event: PointerEvent) => {
    if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) < 7) adventure.pickPlanet(event.clientX, event.clientY);
  };
  const onContextMenu = (event: Event) => event.preventDefault();
  window.addEventListener("resize", onResize);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("contextmenu", onContextMenu);

  window.__gameProbe = () => {
    const probe = adventure.getTestApi().probe as () => { x: number; y: number; z: number };
    return probe();
  };
  if (new URLSearchParams(window.location.search).has("verify")) window.__chopperTest = adventure.getTestApi();

  session = {
    dispose: () => {
      loop.stop();
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("contextmenu", onContextMenu);
      adventure.dispose();
      delete window.__gameProbe;
      delete window.__chopperTest;
      window.__GAME_READY__ = false;
    },
  };
  return handle;
}

export function stopGame(): void {
  session?.dispose();
  session = null;
}
