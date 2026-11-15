const { chromium } = require("playwright");
const path = require("path");
const URL = "file:///" + path.resolve(__dirname, "../../index.html").replace(/\\\\/g, "/");
(async () => {
  const b = await chromium.launch();
  const out = { errors: [] };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  p.on("pageerror", e => out.errors.push("PAGEERROR " + e.message));
  p.on("console", m => { if (m.type() === "error") out.errors.push("CONSOLE " + m.text()); });
  await p.goto(URL + "?nocine=1", { waitUntil: "load" });
  await p.waitForTimeout(5200);
  out.base = await p.evaluate(() => ({
    webgl: window.__hasWebGL,
    hero: !!document.querySelector("#hero-canvas"),
    construct: getComputedStyle(document.getElementById("construct-canvas")).display,
    cube: document.getElementById("cube-root").className,
    overflow: document.documentElement.scrollWidth - innerWidth
  }));
  await p.screenshot({ path: "shots/m-hero-3d.png" });
  await p.evaluate(() => window.scrollTo(0, document.getElementById("skills").offsetTop - 50));
  await p.waitForTimeout(2000);
  out.skills = await p.evaluate(() => {
    const cv = document.querySelector('.skill-stage .specimen-canvas');
    const g = document.createElement("canvas"); g.width=160; g.height=120;
    const cx = g.getContext("2d"); cx.drawImage(cv,0,0,160,120);
    const d = cx.getImageData(0,0,160,120).data; let n=0; for(let i=3;i<d.length;i+=4) if(d[i]>8)n++;
    return { has: document.querySelectorAll(".has-specimen").length, nonEmpty: n, w: cv.width, h: cv.height };
  });
  await p.screenshot({ path: "shots/m-skills-3d.png" });
  await p.evaluate(() => window.scrollTo(0, document.getElementById("works").offsetTop - 50));
  await p.waitForTimeout(1800);
  out.works = await p.evaluate(() => {
    const cv = document.querySelector('.work-stage .specimen-canvas');
    const g = document.createElement("canvas"); g.width=160; g.height=120;
    const cx = g.getContext("2d"); cx.drawImage(cv,0,0,160,120);
    const d = cx.getImageData(0,0,160,120).data; let n=0; for(let i=3;i<d.length;i+=4) if(d[i]>8)n++;
    return { nonEmpty: n, w: cv.width, h: cv.height };
  });
  await p.screenshot({ path: "shots/m-works-3d.png" });

  // mobile city cinema
  const p2 = await ctx.newPage();
  p2.on("pageerror", e => out.errors.push("CINEMA " + e.message));
  await p2.goto(URL, { waitUntil: "load" });
  await p2.waitForTimeout(5200);
  await p2.evaluate(() => window.scrollTo(0, document.getElementById("fab").offsetTop - 80));
  await p2.waitForSelector("#fab-cinema.is-on", { timeout: 15000 });
  await p2.waitForSelector("#fab-cinema.is-shenzhen", { timeout: 16000 });
  await p2.waitForTimeout(900);
  await p2.screenshot({ path: "shots/m-cinema-3d.png" });
  out.cinema = await p2.evaluate(() => ({ parent: document.getElementById("city-canvas").parentElement.id, locked: document.documentElement.classList.contains("is-cinema"), overflow: document.documentElement.scrollWidth - innerWidth }));
  console.log(JSON.stringify(out, null, 2));
  await b.close();
})();
