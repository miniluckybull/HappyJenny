import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, mkdirSync } from "node:fs";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const DIST = join(ROOT, "dist");
const SHOTS = join(ROOT, "verification-shots");
if (!existsSync(join(DIST, "index.html"))) throw new Error("Run npm run build first");
mkdirSync(SHOTS, { recursive: true });

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".webp": "image/webp", ".json": "application/json",
  ".webmanifest": "application/manifest+json", ".wasm": "application/wasm",
};
const server = createServer(async (req, res) => {
  try {
    let raw = decodeURIComponent((req.url || "/").split("?")[0]);
    if (raw.endsWith("/")) raw += "index.html";
    const file = resolve(DIST, "." + raw);
    if (file !== DIST && !file.startsWith(DIST + sep)) { res.writeHead(403).end(); return; }
    const data = await readFile(file);
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-gpu-sandbox", "--use-gl=swiftshader"],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
const attachChecks = (page, label) => {
  page.on("pageerror", (error) => errors.push(`${label}: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error") errors.push(`${label}: ${message.text()}`); });
  page.on("response", (response) => { if (response.status() >= 400) errors.push(`${label}: ${response.status()} ${response.url()}`); });
};
const assert = (condition, message) => { if (!condition) throw new Error(message); };

try {
  const page = await context.newPage();
  attachChecks(page, "platform");
  await page.goto(origin, { waitUntil: "networkidle" });
  assert((await page.title()).includes("HappyJenny"), "Platform title missing");
  assert(await page.locator(".game-showcase").count() === 4, "Expected four game entries");
  const covers = page.locator("img");
  for (let index = 0; index < await covers.count(); index += 1) {
    await covers.nth(index).scrollIntoViewIfNeeded();
    await covers.nth(index).evaluate((image) => image.complete ? undefined : new Promise((resolveLoad) => image.addEventListener("load", resolveLoad, { once: true })));
    assert(await covers.nth(index).evaluate((image) => image.naturalWidth > 0), `Broken cover image ${index}`);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: join(SHOTS, "platform-desktop.png"), fullPage: true });
  const metrics = await page.evaluate(() => ({
    resources: performance.getEntriesByType("resource").length,
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    manifest: document.querySelector("link[rel='manifest']")?.getAttribute("href"),
  }));
  assert(!metrics.horizontalOverflow, "Desktop horizontal overflow");
  assert(metrics.manifest === "./manifest.webmanifest", "PWA manifest missing");

  await page.getByRole("link", { name: "进入乔巴的星际大冒险" }).click();
  await page.waitForFunction(() => window.__GAME_READY__ === true, null, { timeout: 30000 });
  assert(await page.locator(".title-screen").isVisible(), "Space adventure did not open through platform navigation");
  assert(await page.locator("canvas#game-canvas").isVisible(), "Space adventure canvas missing");
  await page.screenshot({ path: join(SHOTS, "space-adventure.png") });
  await page.getByRole("link", { name: "游戏平台" }).click();
  await page.waitForSelector(".platform-page");
  assert(!await page.evaluate(() => document.body.classList.contains("space-game-active")), "Game body state leaked into platform");

  await page.setViewportSize({ width: 375, height: 812 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  assert(!await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), "Mobile horizontal overflow");
  await page.screenshot({ path: join(SHOTS, "platform-mobile.png"), fullPage: true });
  await page.getByRole("button", { name: "返回顶部" }).click();
  await page.close();

  const newLife = await context.newPage();
  attachChecks(newLife, "new-life");
  await newLife.goto(`${origin}/games/new-life/`, { waitUntil: "networkidle" });
  await newLife.waitForFunction(() => window.__GAME_READY__ === true, null, { timeout: 30000 });
  assert(await newLife.getByLabel("自定义角色昵称").isVisible(), "New Life nickname input missing");
  await newLife.getByLabel("自定义角色昵称").fill("平台测试");
  assert((await newLife.locator("body").innerText()).includes("平台测试"), "New Life nickname did not update");
  await newLife.screenshot({ path: join(SHOTS, "new-life.png") });
  await newLife.close();

  const exam = await context.newPage();
  attachChecks(exam, "exam");
  await exam.goto(`${origin}/game/`, { waitUntil: "networkidle" });
  await exam.waitForSelector("canvas#game-canvas", { timeout: 30000 });
  assert((await exam.locator("body").innerText()).includes("试卷炸学校"), "Exam game did not render");
  await exam.screenshot({ path: join(SHOTS, "exam-game.png") });
  await exam.close();

  const planet = await context.newPage();
  attachChecks(planet, "planet");
  await planet.goto(`${origin}/planet-game/`, { waitUntil: "networkidle" });
  assert((await planet.locator("body").innerText()).includes("乘法小星球"), "Planet game did not render");
  assert(await planet.getByText("口诀乐园", { exact: true }).isVisible(), "Planet game menu missing");
  await planet.screenshot({ path: join(SHOTS, "planet-game.png") });
  await planet.close();

  assert(errors.length === 0, errors.join("\n"));
  console.log(`PLATFORM VERIFY OK: four games, SPA return, covers, desktop/mobile, PWA manifest, zero console/HTTP errors. Root resources: ${metrics.resources}.`);
} finally {
  await browser.close();
  server.close();
}
