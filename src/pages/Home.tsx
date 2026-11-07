import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Award, BookOpen, Check, ChevronRight,
  Compass, Flag, Gauge, Home as HomeIcon, Map, Pause, Play, Rocket, RotateCcw,
  ScanLine, Shield, Sparkles, Volume2, VolumeX, X,
} from "lucide-react";
import { startGame, stopGame } from "@/game/boot";
import { PLANETS, PLANET_BY_ID } from "@/game/planet-data";
import type { GameHandle, UIState } from "@/game/types";

type Panel = "none" | "map" | "log" | "help";

function ChopperMascot() {
  return (
    <svg viewBox="0 0 260 260" role="img" aria-label="戴着粉色帽子的乔巴宇宙探险家">
      <path d="M62 91 34 40m18 25L28 52m26 27 4-35M198 91l28-51m-18 25 24-13m-26 27-4-35" fill="none" stroke="#7b4a31" strokeWidth="12" strokeLinecap="round" />
      <circle cx="130" cy="143" r="83" fill="#a95f3e" />
      <ellipse cx="130" cy="161" rx="62" ry="48" fill="#ffd7ae" />
      <ellipse cx="94" cy="137" rx="18" ry="25" fill="white" /><ellipse cx="166" cy="137" rx="18" ry="25" fill="white" />
      <circle cx="96" cy="141" r="9" fill="#172035" /><circle cx="164" cy="141" r="9" fill="#172035" />
      <circle cx="100" cy="136" r="3" fill="white" /><circle cx="168" cy="136" r="3" fill="white" />
      <ellipse cx="130" cy="165" rx="17" ry="12" fill="#3b88c9" />
      <path d="M109 191q21 20 42 0" fill="none" stroke="#6c3b32" strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="77" cy="174" rx="16" ry="8" fill="#ef77a9" opacity=".65" /><ellipse cx="183" cy="174" rx="16" ry="8" fill="#ef77a9" opacity=".65" />
      <path d="M63 91h134v-20H63z" fill="#3b88c9" />
      <path d="M83 73V15h94v58" fill="#ef64a7" /><ellipse cx="130" cy="16" rx="47" ry="10" fill="#ff8cbd" />
      <path d="m109 29 42 34m0-34-42 34" stroke="white" strokeWidth="10" strokeLinecap="round" />
      <circle cx="130" cy="139" r="104" fill="none" stroke="#c8f4ff" strokeWidth="5" opacity=".55" />
      <path d="M55 90a105 105 0 0 1 40-64" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" opacity=".55" />
    </svg>
  );
}

function IconButton({ label, children, onClick, active = false }: { label: string; children: ReactNode; onClick: () => void; active?: boolean }) {
  return <button className={`icon-button ${active ? "active" : ""}`} onClick={onClick} aria-label={label} title={label}>{children}<span>{label}</span></button>;
}

function HoldButton({ label, children, x, z, handle }: { label: string; children: ReactNode; x: number; z: number; handle: React.RefObject<GameHandle | null> }) {
  const stop = () => handle.current?.setVirtualMove(0, 0);
  return (
    <button className="hold-button" aria-label={label} onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); handle.current?.setVirtualMove(x, z); }} onPointerUp={stop} onPointerCancel={stop} onPointerLeave={stop}>
      {children}
    </button>
  );
}

function ProgressDots({ ui }: { ui: UIState }) {
  return <div className="flag-dots" aria-label={`已收集 ${ui.flags.length} 面旗帜，共 8 面`}>
    {PLANETS.map((p) => <span key={p.id} className={ui.flags.includes(p.id) ? "earned" : ""} style={{ "--dot": p.accent } as React.CSSProperties}><Flag size={13} /></span>)}
  </div>;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handle = useRef<GameHandle | null>(null);
  const [ui, setUi] = useState<UIState | null>(null);
  const [panel, setPanel] = useState<Panel>("none");

  useEffect(() => {
    if (!canvasRef.current) return;
    handle.current = startGame(canvasRef.current, setUi);
    return () => { stopGame(); handle.current = null; };
  }, []);

  if (!ui) return <div id="game-root"><canvas id="game-canvas" ref={canvasRef} /><div className="loading-screen"><Rocket className="spin-slow" /><strong>正在准备星际飞船…</strong></div></div>;
  const current = PLANET_BY_ID[ui.currentPlanet] ?? PLANET_BY_ID.earth;
  const act = (fn: () => void) => { fn(); };
  const openPanel = (next: Panel) => setPanel(panel === next ? "none" : next);

  return (
    <div id="game-root">
      <canvas id="game-canvas" ref={canvasRef} />
      <div id="ui-overlay">
        {!ui.ready && <div className="asset-loading"><Rocket size={18} /> 正在装载乔巴的飞船</div>}

        {ui.screen === "title" && <section className="title-screen">
          <div className="title-copy">
            <div className="eyebrow"><Sparkles size={16} /> CHOPPER'S SPACE ACADEMY</div>
            <h1><span>乔巴的</span><br />星际大冒险</h1>
            <p className="title-subtitle">扬起海贼旗，驶向太阳系！<br />在探索与问答中，成为小小天文航海家。</p>
            <div className="feature-chips"><span>3D 自由飞行</span><span>24 张知识卡</span><span>8 座洞穴营地</span></div>
            <div className="title-actions">
              <button className="primary-button big" onClick={() => act(() => handle.current?.start(false))}><Play fill="currentColor" />{ui.hasSave ? "继续星际冒险" : "开始星际冒险"}<ChevronRight /></button>
              {ui.hasSave && <button className="soft-button" onClick={() => { if (window.confirm("要清空当前学习进度，重新开始吗？")) handle.current?.start(true); }}><RotateCcw size={18} /> 新的冒险</button>}
            </div>
            <div className="quick-steps">
              <div><b>01</b><span>驾驶飞船<br /><small>点击星球自动导航</small></span></div>
              <div><b>02</b><span>登陆与探索<br /><small>扫描信标和天然洞穴</small></span></div>
              <div><b>03</b><span>学习与插旗<br /><small>集齐八面知识旗帜</small></span></div>
            </div>
          </div>
          <div className="mascot-wrap">
            <div className="mascot-orbit" />
            <div className="mascot-card"><ChopperMascot /></div>
            <div className="speech-bubble">“医生也能成为<br /><b>宇宙探险家！</b>”</div>
          </div>
          <footer className="title-footer">非官方同人科普游戏 · 行星距离经过压缩，部分洞穴住所为冒险想象 · 科学知识参考 NASA</footer>
        </section>}

        {ui.screen !== "title" && <div className="hud">
          <div className="mission-card glass">
            <div className="mission-top"><span className="planet-pip" style={{ background: current.accent }} />{ui.mode === "space" ? "太阳系航行中" : ui.mode === "surface" ? current.landing : `${current.name}洞穴营地`}</div>
            <strong>{ui.objective}</strong>
            {ui.targetDistance > 0 && (ui.mode !== "cave" || ui.learned[current.id]?.length === 3) && <div className="compass-row"><Compass size={17} /><span className="bearing-arrow" style={{ transform: `rotate(${ui.bearing}rad)` }}>↑</span><span>{ui.targetDistance} {ui.mode === "space" ? "航里" : "米"}</span></div>}
          </div>

          <div className="top-progress glass"><span>知识航海日志</span><ProgressDots ui={ui} /><b>{ui.flags.length} / 8</b></div>
          <div className="hud-actions">
            <IconButton label="星球导航" onClick={() => openPanel("map")} active={panel === "map"}><Map /></IconButton>
            <IconButton label="学习日志" onClick={() => openPanel("log")} active={panel === "log"}><BookOpen /></IconButton>
            <IconButton label={ui.muted ? "开启声音" : "静音"} onClick={() => handle.current?.toggleMute()}>{ui.muted ? <VolumeX /> : <Volume2 />}</IconButton>
            <IconButton label="暂停" onClick={() => handle.current?.togglePause()}><Pause /></IconButton>
          </div>

          <div className="status-card glass">
            {ui.mode === "space" ? <>
              <div className="status-line"><Gauge size={17} /><span>航速</span><b>{ui.speed}</b></div>
              <div className="status-line"><Shield size={17} /><span>护盾</span><b>{ui.shield}%</b></div>
              <div className="meter"><i style={{ width: `${ui.shield}%` }} /></div>
            </> : <>
              <div className="status-line"><ScanLine size={17} /><span>扫描能量</span><b>{ui.scan}%</b></div>
              <div className="meter cyan"><i style={{ width: `${ui.scan}%` }} /></div>
              <small>扫描会自动恢复</small>
            </>}
          </div>

          {ui.prompt && <div className="action-prompt">{ui.prompt}</div>}
          <div className="desktop-controls">{ui.mode === "space" ? "W 加速  S 刹车  A/D 转向  E 着陆" : "WASD 移动  Q 扫描  E 互动  拖动鼠标转视角"}</div>
          <div className="quick-actions">
            {ui.mode !== "space" && <button className="round-action scan" onClick={() => handle.current?.scan()}><ScanLine /><span>扫描 Q</span></button>}
            <button className="round-action interact" onClick={() => handle.current?.interact()}><Sparkles /><span>互动 E</span></button>
          </div>
          <div className="mobile-dpad">
            <HoldButton label="向前" x={0} z={1} handle={handle}><ArrowUp /></HoldButton>
            <HoldButton label="向左" x={-1} z={0} handle={handle}><ArrowLeft /></HoldButton>
            <HoldButton label="向后" x={0} z={-1} handle={handle}><ArrowDown /></HoldButton>
            <HoldButton label="向右" x={1} z={0} handle={handle}><ArrowRight /></HoldButton>
          </div>
        </div>}

        {ui.toast && ui.screen === "playing" && <div className="toast"><Sparkles size={17} />{ui.toast}</div>}

        {panel !== "none" && ui.screen !== "title" && <div className="panel-backdrop" onClick={() => setPanel("none")}>
          <section className="side-panel" onClick={(e) => e.stopPropagation()}>
            <header><div><span className="eyebrow">SPACE ACADEMY</span><h2>{panel === "map" ? "星球导航图" : panel === "log" ? "乔巴的学习日志" : "探险家操作手册"}</h2></div><button className="close-button" onClick={() => setPanel("none")}><X /></button></header>
            {panel === "map" && <>
              <div className="panel-note"><Rocket size={18} />{ui.mode === "space" ? "选择目的地后自动导航，抵达附近按 E 着陆。" : "正在地表或洞穴中，请先返回飞船再前往其他星球。"}</div>
              <div className="planet-grid">{PLANETS.map((p) => {
                const count = ui.learned[p.id]?.length ?? 0;
                const flagged = ui.flags.includes(p.id);
                return <button key={p.id} className={`planet-card ${ui.targetPlanet === p.id ? "selected" : ""}`} onClick={() => { handle.current?.travel(p.id); if (ui.mode === "space") setPanel("none"); }}>
                  <span className={`planet-orb ${p.id}`} style={{ "--planet": p.accent } as React.CSSProperties}>{flagged && <Flag size={22} />}</span>
                  <span className="planet-info"><small>{p.english} · {p.kind}</small><strong>{p.name}</strong><em>登陆：{p.landingShort}</em></span>
                  <span className="planet-progress"><b>{count}/3</b><small>{flagged ? "已插旗" : "知识卡"}</small><ChevronRight size={17} /></span>
                </button>;
              })}</div>
              <div className="scale-note">科学提示：游戏中的大小与距离经过压缩。气态与冰巨行星任务登陆的是其代表性卫星。</div>
            </>}
            {panel === "log" && <>
              <div className="log-summary"><div><Flag /><b>{ui.flags.length}</b><span>知识旗帜</span></div><div><BookOpen /><b>{Object.values(ui.learned).reduce((n, a) => n + a.length, 0)}</b><span>已学知识卡</span></div><div><HomeIcon /><b>{ui.caves.length}</b><span>发现洞穴</span></div></div>
              <div className="log-list">{PLANETS.map((p) => <details key={p.id} className="log-entry">
                <summary><span className="log-dot" style={{ background: p.accent }} /><strong>{p.name}</strong><small>{p.kind} · {ui.learned[p.id]?.length ?? 0}/3</small>{ui.flags.includes(p.id) && <Flag size={17} className="earned-icon" />}</summary>
                <div className="log-body"><p>{p.description}</p><div className="fact-grid"><span>距太阳<b>{p.au}</b></span><span>自转一周<b>{p.day}</b></span><span>公转一周<b>{p.year}</b></span><span>考察地点<b>{p.landingShort}</b></span></div>
                  {p.lessons.map((item, i) => <div key={i} className={`lesson-log ${ui.learned[p.id]?.includes(i) ? "unlocked" : "locked"}`}><span>{ui.learned[p.id]?.includes(i) ? <Check size={16} /> : i + 1}</span><div><strong>{item.title}</strong><p>{ui.learned[p.id]?.includes(i) ? item.body : "抵达这颗星球，找到对应知识信标后解锁。"}</p></div></div>)}
                  <p className="cave-science">{p.caveStatus}</p>
                </div>
              </details>)}</div>
              <p className="source-note">科学知识依据 NASA 行星资料编写为儿童语言；“全面了解”指完成本游戏的三站基础课程，并非穷尽所有天文知识。</p>
            </>}
            {panel === "help" && <div className="help-content">
              <div className="help-section"><h3>太空驾驶</h3><p><kbd>W</kbd> 加速　<kbd>S</kbd> 刹车　<kbd>A</kbd><kbd>D</kbd> 转向　<kbd>E</kbd> 着陆</p><p>也可以打开星球导航或点击三维星球自动航行。手动接管时留意小行星，护盾耗尽会触发友好救援。</p></div>
              <div className="help-section"><h3>地表与洞穴</h3><p><kbd>WASD</kbd> 移动　<kbd>Q</kbd> 扫描　<kbd>E</kbd> 互动　<kbd>L</kbd> 返回太空</p><p>扫描能量会自动恢复。跟随罗盘寻找三个知识信标；全部答对后，洞穴里的旗座会发光。</p></div>
              <div className="help-section"><h3>科学幻想边界</h3><p>地球天然洞穴是真实的；火星存在熔岩管候选区域。其他目的地的可居住洞穴营地主要服务于游戏想象，每颗星球的学习日志都有明确说明。真实洞穴不能独自进入。</p></div>
              <div className="help-section"><h3>儿童模式</h3><p>答错没有惩罚，可以立即重答。没有战斗和恐怖内容。进度只保存在当前浏览器，不会同步到其他设备。</p></div>
            </div>}
          </section>
        </div>}

        {ui.dialog && <div className={`dialog-backdrop ${ui.dialog.kind === "flag" ? "celebration" : ""}`}>
          {ui.dialog.kind === "flag" && <div className="confetti" aria-hidden="true">{Array.from({ length: 28 }, (_, i) => <i key={i} style={{ "--i": i } as React.CSSProperties} />)}</div>}
          <section className={`dialog-card ${ui.dialog.kind}`}>
            <button className="close-button dialog-close" onClick={() => handle.current?.closeDialog()} aria-label="关闭"><X /></button>
            {ui.dialog.kind === "flag" ? <div className="dialog-emblem"><Flag /></div> : ui.dialog.kind === "result" ? <div className="dialog-emblem success"><Check /></div> : ui.dialog.kind === "lesson" ? <div className="dialog-emblem"><BookOpen /></div> : <div className="dialog-emblem"><Sparkles /></div>}
            {ui.dialog.tag && <span className="dialog-tag">{ui.dialog.tag}</span>}
            <h2>{ui.dialog.title}</h2>
            {ui.dialog.body && <p className="dialog-body">{ui.dialog.body}</p>}
            {ui.dialog.kind === "quiz" && <div className="quiz-block">
              <h3>{ui.dialog.question}</h3>
              <div className="quiz-options">{ui.dialog.options?.map((option, i) => <button key={i} className={ui.dialog?.wrongChoice === i ? "wrong" : ""} onClick={() => handle.current?.answer(i)}><span>{i + 1}</span>{option}{ui.dialog?.wrongChoice === i && <RotateCcw size={18} />}</button>)}</div>
              {ui.dialog.explanation && <p className="try-again">{ui.dialog.explanation}</p>}
            </div>}
            {ui.dialog.kind === "result" && ui.dialog.explanation && <div className="next-objective"><Compass size={20} />{ui.dialog.explanation}</div>}
            {ui.dialog.kind === "lesson" && <button className="primary-button" onClick={() => handle.current?.advanceDialog()}>我听懂了，开始答题<ChevronRight /></button>}
            {(ui.dialog.kind === "result" || ui.dialog.kind === "notice" || ui.dialog.kind === "flag") && <button className="primary-button" onClick={() => handle.current?.advanceDialog()}>{ui.dialog.kind === "flag" ? (ui.flags.length === 8 ? "参加星际毕业典礼" : "继续星际冒险") : "继续探索"}<ChevronRight /></button>}
          </section>
        </div>}

        {ui.screen === "paused" && panel === "none" && <div className="state-backdrop"><section className="state-card"><span className="eyebrow">TAKE A LITTLE BREAK</span><h2>冒险暂停</h2><p>乔巴和飞船都在等你回来。</p><button className="primary-button big" onClick={() => handle.current?.togglePause()}><Play />继续探索</button>
          <div className="state-grid"><button className="soft-button" onClick={() => setPanel("help")}><BookOpen />操作与科学说明</button><button className="soft-button" onClick={() => handle.current?.setQuality(ui.quality === "high" ? "low" : "high")}><Gauge />{ui.quality === "high" ? "切换流畅画质" : "切换精美画质"}</button></div>
          <button className="text-button" onClick={() => handle.current?.returnTitle()}><HomeIcon size={17} />返回标题</button>
        </section></div>}

        {ui.screen === "gameover" && <div className="state-backdrop rescue"><section className="state-card"><div className="dialog-emblem"><Shield /></div><span className="eyebrow">CHOPPER RESCUE TEAM</span><h2>乔巴救援队来了！</h2><p>飞船只是需要休息一下。知识卡和旗帜都已保留，补充护盾后就能继续。</p><button className="primary-button big" onClick={() => handle.current?.restart()}><Rocket />修复飞船，继续冒险</button><button className="text-button" onClick={() => handle.current?.returnTitle()}>返回标题</button></section></div>}

        {ui.screen === "victory" && <div className="state-backdrop victory"><section className="state-card graduation"><div className="graduation-stars">✦　✧　✦</div><Award className="award-icon" /><span className="eyebrow">SOLAR SYSTEM GRADUATION</span><h2>小小天文航海家，毕业啦！</h2><p>你和乔巴完成了八大行星的基础课程，发现了八座幻想营地，让八面海贼旗在太阳系中飘扬。</p><ProgressDots ui={ui} /><div className="victory-stats"><span><b>24</b>知识卡</span><span><b>8</b>知识旗帜</span><span><b>{Math.max(1, Math.round(ui.elapsed / 60))}</b>分钟探索</span></div><button className="primary-button big" onClick={() => handle.current?.restart()}><Rocket />继续自由探索</button><button className="text-button" onClick={() => handle.current?.returnTitle()}>返回标题</button></section></div>}
      </div>
    </div>
  );
}
