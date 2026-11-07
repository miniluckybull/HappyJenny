# HappyJenny 妞宝的游戏乐园

一个面向儿童与家庭的浏览器游戏平台。统一首页汇集四款游戏，支持电脑、手机和平板，无需单独下载安装。

## 游戏入口

| 游戏 | 平台入口 | 主要内容 |
| --- | --- | --- |
| 你的新生活 | `/games/new-life/` | 95 种造型选择、自定义昵称、3D 换装与三段平台跳跃关卡 |
| 乔巴的星际大冒险 | `/space-adventure` | 太阳系航行、八大行星探索、24 张知识卡与 8 座幻想营地 |
| 试卷炸学校 | `/game/` | 幻想教室场景、乘法练习与安全的卡通魔法反馈 |
| 乘法小星球 | `/planet-game/` | 口诀点读、分级闯关、一分钟快算与错题复习 |

《你的新生活》沿用已验证的平板触控修复版，包括松手停止、每次重生静止、多指操作、滑动视角灵敏度调整和全屏输入清理。

## 项目结构

平台首页与星际冒险保留可维护的 React / TypeScript 源码：

- `src/pages/Home.tsx`：四游戏平台首页。
- `src/pages/SpaceAdventure.tsx`：星际冒险页面，独立懒加载。
- `src/game/`：星际冒险及共享的游戏模块。
- `src/index.css`：平台首页样式。
- `src/space-adventure.css`：星际冒险独立样式。

其余三款游戏以已验证的生产静态包接入，避免多个 Three.js 应用互相覆盖画布、全局样式和存档：

- `public/games/new-life/`：《你的新生活》生产包，入口路由已适配平台子目录。
- `public/game/`：《试卷炸学校》独立入口。
- `public/planet-game/`：《乘法小星球》独立入口与图片。
- `public/legacy/`：上述两款早期游戏共用的静态脚本、样式和资源。

**维护注意：**`public/games/`、`public/game/`、`public/planet-game/` 和 `public/legacy/` 中包含构建后的压缩脚本，不是完整原始页面源码。修改这些游戏的核心玩法时，应优先恢复对应源项目并重新构建，再整体替换静态包；不要直接在压缩代码中开发新功能。替换时需保留子目录路由、HashRouter 入口和相对资源路径适配。

## 本地运行

需要 Node.js 20 或兼容版本。

```bash
npm ci
npm run dev
```

类型检查、生产构建与本地预览：

```bash
npm run check
npm run build
npm run preview
```

平台按域名根目录部署。`/space-adventure` 是 React 内部路由，静态托管服务需要提供 SPA 回退；其他三款游戏通过各自的 `index.html` 独立启动。

## 浏览器回归

先完成生产构建，再运行：

```bash
npm run verify
```

可通过 `CHROMIUM_PATH` 指定本机 Chromium：

```bash
CHROMIUM_PATH=/usr/bin/chromium npm run verify
```

回归覆盖平台四入口、真实封面、桌面与手机布局、星际冒险进入和返回、新生活昵称输入、两款早期游戏启动、PWA manifest，以及控制台和 HTTP 错误。测试截图写入已被 Git 忽略的 `verification-shots/`。

## PWA 与存档

- `public/manifest.webmanifest`、`public/icons/` 和 `public/sw.js` 提供安装到桌面或主屏幕的基础能力。
- Service Worker 对页面导航始终请求网络，对静态资源使用运行时缓存；localhost 或 HTTPS 环境下生效。
- 各游戏的装扮、闯关、学习和设置记录使用浏览器 `localStorage`，只保存在当前浏览器，不跨设备同步。
- 清除浏览器数据会删除本机记录。平台没有账号、充值或真实个人信息收集流程。

## 星际冒险操作

### 太空驾驶

- `W`：加速；`S`：刹车；`A` / `D`：转向；`E`：着陆。
- 也可打开星球导航或点击三维星球自动航行。

### 地表与洞穴

- `WASD`：移动；`Q`：扫描；`E`：互动；`L`：返回太空。
- `Esc`：暂停或继续。
- 手机和平板可使用屏幕方向按钮与互动按钮。

行星大小与距离经过游戏化压缩，洞穴营地包含明确标注的冒险想象；本项目为非官方同人科普游戏。

## 技术与资源

- React、TypeScript、Vite、React Router、Three.js。
- 飞船资源及加载代码位于 `public/assets/shuttle/`，使用时请保持目录完整。
- 随附 Three.js MIT 许可文本：`public/assets/shuttle/THREE-LICENSE.txt`。
- 仓库不提交 `node_modules`、`dist`、测试截图或本地环境文件。未经授权，不将本仓库内容视为官方授权 IP 或默认开源许可。
