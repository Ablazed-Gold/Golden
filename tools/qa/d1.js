const { chromium } = require("playwright");
const path = require("path");
const URL = "file:///" + path.resolve(__dirname, "../../index.html").replace(/\\\\/g, "/");
(async () => {
  const b = await chromium.launch();
  const out = { errors: [] };
  // mobile
  const mctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const mp = await mctx.newPage();
  mp.on("pageerror", e => out.errors.push("M " + e.message));
  await mp.goto(URL, { waitUntil: "load" });
  await mp.waitForTimeout(4600);
  await mp.evaluate(() => window.scrollTo(0, document.getElementById("fab").offsetTop - 80));
  await mp.waitForTimeout(1200);
  await mp.screenshot({ path: "shots/d-m-fab.png" });
  out.mobile = await mp.evaluate(() => ({
    cinemaDone: document.getElementById("fab").classList.contains("cinema-done"),
    artOpacity: getComputedStyle(document.querySelector("#fab .fab-art")).opacity,
    replay: getComputedStyle(document.getElementById("fab-replay")).display,
    overflow: document.documentElement.scrollWidth - innerWidth
  }));
  await mctx.close();
  // reduced
  const rctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const rp = await rctx.newPage();
  rp.on("pageerror", e => out.errors.push("R " + e.message));
  await rp.goto(URL, { waitUntil: "load" });
  await rp.waitForTimeout(1800);
  await rp.evaluate(() => window.scrollTo(0, document.getElementById("fab").offsetTop - 80));
  await rp.waitForTimeout(900);
  await rp.screenshot({ path: "shots/d-rm-fab.png" });
  out.reduced = await rp.evaluate(() => ({ cinemaDone: document.getElementById("fab").classList.contains("cinema-done"), artOpacity: getComputedStyle(document.querySelector("#fab .fab-art")).opacity }));
  await rctx.close();
  // light theme cinema (title stage + final)
  const lctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const lp = await lctx.newPage();
  lp.on("pageerror", e => out.errors.push("L " + e.message));
  await lp.goto(URL, { waitUntil: "load" });
  await lp.waitForTimeout(4600);
  await lp.click("#theme-toggle");
  await lp.waitForTimeout(800);
  await lp.evaluate(() => window.scrollTo(0, document.getElementById("fab").offsetTop - 200));
  await lp.waitForSelector("#fab-cinema.is-printing", { timeout: 8000 });
  await lp.waitForTimeout(2400);
  await lp.screenshot({ path: "shots/d-light-print.png" });
  await lp.waitForSelector("#fab-cinema.is-shenzhen", { timeout: 9000 });
  await lp.waitForTimeout(400);
  await lp.screenshot({ path: "shots/d-light-shenzhen.png" });
  await lp.waitForFunction(() => document.getElementById("fab-cinema").hidden === true, null, { timeout: 8000 });
  await lp.waitForTimeout(600);
  await lp.screenshot({ path: "shots/d-light-final.png" });
  out.light = await lp.evaluate(() => ({ canvasParent: document.getElementById("city-canvas").parentElement.id, done: document.getElementById("fab").classList.contains("cinema-done") }));
  await lctx.close();
  // no webgl
  const nctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await nctx.addInitScript(() => {
    const o = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (t) { if (/webgl/i.test(String(t))) return null; return o.apply(this, arguments); };
  });
  const np = await nctx.newPage();
  np.on("pageerror", e => out.errors.push("N " + e.message));
  await np.goto(URL, { waitUntil: "load" });
  await np.waitForTimeout(5200);
  await np.evaluate(() => window.scrollTo(0, document.getElementById("fab").offsetTop - 80));
  await np.waitForTimeout(1000);
  out.noWebgl = await np.evaluate(() => ({ cinemaDone: document.getElementById("fab").classList.contains("cinema-done"), overlayHidden: document.getElementById("fab-cinema").hidden, artDisplay: getComputedStyle(document.querySelector("#fab .fab-art")).opacity }));
  await nctx.close();
  console.log(JSON.stringify(out, null, 2));
  await b.close();
})();
