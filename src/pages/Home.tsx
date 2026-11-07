import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Gamepad2,
  HardDrive,
  MonitorSmartphone,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface GameInfo {
  title: string;
  english: string;
  description: string;
  image: string;
  href: string;
  internal?: boolean;
  tags: string[];
  facts: { value: string; label: string }[];
  note: string;
}

const GAMES: GameInfo[] = [
  {
    title: "你的新生活",
    english: "NEW LIFE · NEW YOU",
    description: "从昵称、发型和五官开始，创造一个独一无二的立体伙伴。换好衣服，再去草原、云朵工厂和星光古堡里奔跑跳跃。",
    image: "./images/new-life-preview.png",
    href: "./games/new-life/",
    tags: ["3D 换装", "平台跳跃", "全新入驻"],
    facts: [
      { value: "95", label: "种造型选择" },
      { value: "3", label: "段机关冒险" },
      { value: "12×3", label: "颗星星等你收集" },
    ],
    note: "支持自定义昵称、平板全屏触控与二段跳。",
  },
  {
    title: "乔巴的星际大冒险",
    english: "CHOPPER'S SPACE ACADEMY",
    description: "驾驶小飞船穿过太阳系，登陆星球寻找知识信标。答对有趣的问题，收集知识旗帜，发现藏在星球上的幻想营地。",
    image: "./images/space-adventure-preview.png",
    href: "/space-adventure",
    internal: true,
    tags: ["3D 航行", "天文科普", "自由探索"],
    facts: [
      { value: "8", label: "大行星目的地" },
      { value: "24", label: "张知识卡" },
      { value: "8", label: "座幻想营地" },
    ],
    note: "非官方同人科普游戏，科学知识已转为儿童语言。",
  },
  {
    title: "试卷炸学校",
    english: "EXAM MAGIC",
    description: "在教室、食堂和操场等幻想场景中回答乘法题。每一次正确作答，都会触发轻松、安全的卡通魔法。",
    image: "./images/exam-game-preview.png",
    href: "./game/",
    tags: ["3D 场景", "乘法口诀", "卡通魔法"],
    facts: [
      { value: "6", label: "个幻想场景" },
      { value: "8", label: "道题完成一轮" },
      { value: "3", label: "种魔法特效" },
    ],
    note: "没有真实破坏，答错也可以继续尝试。",
  },
  {
    title: "乘法小星球",
    english: "MULTIPLICATION PLANET",
    description: "把每天十分钟的口算练习变成星球旅行。口诀点读、分级闯关、一分钟快算和错题复习，总有一种方式适合今天。",
    image: "./images/multiplication-planet-home.png",
    href: "./planet-game/",
    tags: ["口算练习", "错题复习", "轻松闯关"],
    facts: [
      { value: "4", label: "种练习模式" },
      { value: "10", label: "分钟轻松练习" },
      { value: "∞", label: "次重新挑战" },
    ],
    note: "练习记录只保存在当前浏览器，不上传个人信息。",
  },
];

function GameLink({ game, className, children, label }: { game: GameInfo; className?: string; children: ReactNode; label?: string }) {
  if (game.internal) return <Link className={className} to={game.href} aria-label={label}>{children}</Link>;
  return <a className={className} href={game.href} aria-label={label}>{children}</a>;
}

function PlanetMark() {
  return <span className="planet-mark" aria-hidden="true"><i /><b /></span>;
}

export default function Home() {
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const available = document.documentElement.scrollHeight - window.innerHeight;
      const progress = available > 0 ? Math.min(1, window.scrollY / available) : 0;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${progress})`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="platform-page">
      <div className="scroll-progress" ref={progressRef} aria-hidden="true" />
      <header className="site-header page-shell">
        <a className="brand" href="#top" aria-label="HappyJenny 游戏平台首页">
          <PlanetMark />
          <span><strong>HappyJenny</strong><small>妞宝的游戏乐园</small></span>
        </a>
        <nav className="main-nav" aria-label="平台导航">
          <a href="#games">全部游戏</a>
          <a href="#about">家长须知</a>
        </nav>
        <a className="header-play" href="./games/new-life/">
          玩新游戏 <ArrowUpRight size={17} />
        </a>
      </header>

      <main id="top">
        <section className="hero page-shell" aria-labelledby="hero-title">
          <div className="hero-copy">
            <span className="section-label"><Sparkles size={15} /> FOUR WORLDS TO EXPLORE</span>
            <h1 id="hero-title">小小的游戏，<br />装下<span>大大的想象。</span></h1>
            <p>换装、跳跃、星际探索和乘法练习，都放进同一个游戏乐园。选择喜欢的世界，打开浏览器就出发。</p>
            <div className="hero-actions">
              <a className="button button-primary" href="./games/new-life/">
                <Play size={18} fill="currentColor" /> 开始新生活 <ArrowRight size={18} />
              </a>
              <a className="text-link" href="#games">看看全部游戏 <ArrowRight size={17} /></a>
            </div>
            <dl className="hero-stats">
              <div><dt>4</dt><dd>款网页游戏</dd></div>
              <div><dt>0</dt><dd>次下载安装</dd></div>
              <div><dt>∞</dt><dd>种想象空间</dd></div>
            </dl>
          </div>

          <div className="hero-gallery">
            <a className="hero-browser" href="./games/new-life/" aria-label="进入你的新生活">
              <div className="browser-bar"><i /><i /><i /><span>happyjenny / new-life</span></div>
              <img src="./images/new-life-preview.png" alt="你的新生活换装界面，立体人物站在左侧，右侧是造型菜单" fetchPriority="high" />
              <span className="new-game-stamp"><Sparkles size={16} /> 新游戏入驻</span>
            </a>
            <Link className="hero-orbit-card" to="/space-adventure" aria-label="进入乔巴的星际大冒险">
              <img src="./images/space-adventure-preview.png" alt="乔巴的星际大冒险标题画面" />
              <span>也可以去太阳系看看 <ArrowUpRight size={16} /></span>
            </Link>
          </div>
        </section>

        <div className="play-strip" aria-label="平台特点">
          <div className="page-shell strip-track">
            <span>打开即玩</span><i />
            <span>手机与平板触控</span><i />
            <span>键盘与鼠标操作</span><i />
            <span>学习记录留在本机</span>
          </div>
        </div>

        <section className="games-section page-shell" id="games" aria-labelledby="games-title">
          <div className="section-heading">
            <div><span className="section-label">CHOOSE YOUR NEXT WORLD</span><h2 id="games-title">今天，想去哪个世界？</h2></div>
            <p>四款游戏，四种不同的玩法。<br />每一次点击都是一场新冒险。</p>
          </div>

          <div className="game-showcases">
            {GAMES.map((game, index) => (
              <article className={`game-showcase ${index % 2 ? "reverse" : ""}`} key={game.title}>
                <GameLink game={game} className="game-visual" label={`开始${game.title}`}>
                  <div className="browser-bar"><i /><i /><i /><span>happyjenny / play-{String(index + 1).padStart(2, "0")}</span></div>
                  <img className={game.title === "乘法小星球" ? "portrait-shot" : ""} src={game.image} alt={`${game.title}真实游戏画面`} loading="eager" />
                  <span className="visual-play"><Play size={18} fill="currentColor" /> 打开游戏</span>
                </GameLink>
                <div className="game-copy">
                  <span className="game-index">{String(index + 1).padStart(2, "0")} / 04</span>
                  <span className="game-english">{game.english}</span>
                  <h3>{game.title}</h3>
                  <p>{game.description}</p>
                  <ul className="game-tags" aria-label="游戏特点">{game.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul>
                  <dl className="game-facts">{game.facts.map((fact) => <div key={fact.label}><dt>{fact.value}</dt><dd>{fact.label}</dd></div>)}</dl>
                  <GameLink game={game} className="game-play-link" label={`立即开始${game.title}`}>
                    立即开始 <ArrowUpRight size={20} />
                  </GameLink>
                  <small className="game-note">{game.note}</small>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="about-section page-shell" id="about" aria-labelledby="about-title">
          <div className="about-intro">
            <span className="section-label">A SMALL NOTE FOR GROWN-UPS</span>
            <h2 id="about-title">给孩子探索，<br />也给家长安心。</h2>
          </div>
          <div className="about-points">
            <div><MonitorSmartphone /><h3>打开浏览器就能玩</h3><p>电脑使用键盘和鼠标，手机与平板使用屏幕触控。部分游戏支持全屏。</p></div>
            <div><HardDrive /><h3>记录只保存在本机</h3><p>装扮、闯关和学习进度不会跨设备同步，清除浏览器数据会删除记录。</p></div>
            <div><ShieldCheck /><h3>适度游戏，注意休息</h3><p>建议孩子分段游玩。游戏内没有充值入口，也不需要填写真实个人信息。</p></div>
          </div>
        </section>

        <section className="closing-section page-shell">
          <Gamepad2 size={34} />
          <h2>准备好了吗？<br /><span>下一个故事由你来玩。</span></h2>
          <a className="button button-primary" href="./games/new-life/"><Play size={18} fill="currentColor" /> 进入你的新生活 <ArrowRight size={18} /></a>
        </section>
      </main>

      <footer className="site-footer page-shell">
        <a className="brand" href="#top"><PlanetMark /><span><strong>HappyJenny</strong><small>陪每一次好奇与进步</small></span></a>
        <p>用浏览器返回键，可以随时回到游戏平台。</p>
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>返回顶部 <ArrowUp size={16} /></button>
      </footer>
    </div>
  );
}
