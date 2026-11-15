const { webkit, devices } = require("playwright");
const path = require("path");
const URL = "file:///" + path.resolve(__dirname, "../../index.html").replace(/\\\\/g, "/");
(async () => {
  const b = await webkit.launch();
  const out = { errors: [] };
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  p.on("pageerror", e => out.errors.push("PAGEERROR " + e.message));
  p.on("console", m => { if (m.type() === "error") out.errors.push("CONSOLE " + m.text()); });
  await p.goto(URL + "?nocine=1", { waitUntil: "load" });
  await p.waitForTimeout(6000);
  out.state = await p.evaluate(() => ({
    webgl: window.__hasWebGL,
    booted: document.body.classList.contains("is-ready"),
    hero: !!document.querySelector("#hero-canvas"),
    construct: getComputedStyle(document.getElementById("construct-canvas")).display,
    cube: document.getElementById("cube-root").className,
    skillsHas: document.querySelectorAll(".has-specimen").length,
    overflow: document.documentElement.scrollWidth - innerWidth
  }));
  await p.evaluate(() => window.scrollTo(0, document.getElementById("skills").offsetTop - 50));
  await p.waitForTimeout(2500);
  out.skills = await p.evaluate(() => ({ has: document.querySelectorAll(".has-specimen").length }));
  await p.screenshot({ path: "shots/wk-skills.png" });
  // iphone-ish webkit
  const ictx = await b.newContext({ ...devices["iPhone 13"] });
  const ip = await ictx.newPage();
  ip.on("pageerror", e => out.errors.push("IPHONE " + e.message));
  await ip.goto(URL + "?nocine=1", { waitUntil: "load" });
  await ip.waitForTimeout(6000);
  out.iphone = await ip.evaluate(() => ({ webgl: window.__hasWebGL, booted: document.body.classList.contains("is-ready"), hero: !!document.querySelector("#hero-canvas"), overflow: document.documentElement.scrollWidth - innerWidth }));
  await ip.screenshot({ path: "shots/wk-iphone-hero.png" });
  console.log(JSON.stringify(out, null, 2));
  await b.close();
})();
