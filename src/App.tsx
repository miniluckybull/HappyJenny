import { lazy, Suspense } from "react";
import { Link, Route, Routes } from "react-router";
import Home from "./pages/Home";

const SpaceAdventure = lazy(() => import("./pages/SpaceAdventure"));

function GameLoading() {
  return <div className="not-found" role="status"><p>正在准备星际飞船，请稍候……</p></div>;
}

function NotFound() {
  return (
    <main className="not-found">
      <span className="section-label">404 · LOST IN SPACE</span>
      <h1>这个星球还没有游戏。</h1>
      <p>回到游戏平台，选择一段已经准备好的冒险吧。</p>
      <Link className="button button-primary" to="/">返回游戏平台</Link>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/space-adventure" element={<Suspense fallback={<GameLoading />}><SpaceAdventure /></Suspense>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
