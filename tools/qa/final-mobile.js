const { chromium } = require("playwright");
const path = require("path");
const URL = "file:///" + path.resolve(__dirname, "../../index.html").replace(/\\\\/g, "/");
(async () => {
  const b = await chromium.launch();
  const out = { errors: [] };
  // mobile finish landing
  const mctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const mp = await mctx.newPage();
  mp.on("pageerror", e => out.errors.push("M " + e.message));
  await mp.goto(URL, { waitUntil: "load" });
  await mp.waitForTimeout(5200);
  await mp.evaluate(() => window.scrollTo(0, document.getElementById("fab").offsetTop - 80));
  await mp.waitForSelector("#fab-cinema.is-on", { timeout: 16000 });
  await mp.waitForSelector("#fab-cinema.is-shenzhen", { timeout: 18000 });
  await mp.waitForTimeout(900);
  await mp.click("#cinema-skip").catch(()=>{});
  await mp.waitForTimeout(1200);
  out.mobile = await mp.evaluate(() => ({ overlayHidden: document.getElementById("fab-cinema").hidden, locked: document.documentElement.classList.contains("is-cinema"), fabTop: Math.round(document.getElementById("fab").getBoundingClientRect().top), overflow: document.documentElement.scrollWidth - innerWidth, webgl: window.__hasWebGL }));
  await mctx.close();
  // no webgl desktop
  const nctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await nctx.addInitScript(() => {
    const o = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (t) { if (/webgl/i.test(String(t))) return null; return o.apply(this, arguments); };
  });
  const np = await nctx.newPage();
  np.on("pageerror", e => out.errors.push("N " + e.message));
  await np.goto(URL + "?nocine=1", { waitUntil: "load" });
  await np.waitForTimeout(5200);
  out.noWebgl = await np.evaluate(() => ({ webgl: window.__hasWebGL, cls: document.documentElement.classList.contains("no-webgl"), notice: document.getElementById("foot-webgl").textContent, noticeVisible: getComputedStyle(document.getElementById("foot-webgl")).display }));
  await nctx.close();
  console.log(JSON.stringify(out, null, 2));
  await b.close();
})();
