const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const out = { errors: [] };
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  p.on("pageerror", e => out.errors.push("PAGEERROR " + e.message));
  p.on("console", m => { if (m.type() === "error") out.errors.push("CONSOLE " + m.text()); });
  const resp = await p.goto("https://ablazed-gold.github.io/Golden/?v=" + Date.now(), { waitUntil: "load", timeout: 60000 });
  out.status = resp.status();
  out.headers = await resp.allHeaders();
  await p.waitForTimeout(5200);
  out.state = await p.evaluate(() => ({
    hero: !!document.querySelector(".wordmark-solid"),
    sections: document.querySelectorAll("main .sec").length,
    skillStage: !!document.querySelector(".skill-stage canvas[data-specimen=skills]"),
    workStage: !!document.querySelector(".work-stage canvas[data-specimen=works]"),
    fabCinema: !!document.getElementById("fab-cinema"),
    nav: document.querySelectorAll("#nav a").length
  }));
  await p.evaluate(() => window.scrollTo(0, document.getElementById("skills").offsetTop - 60));
  await p.waitForTimeout(1500);
  await p.screenshot({ path: "live2-skills.png" });
  await p.evaluate(() => window.scrollTo(0, document.getElementById("fab").offsetTop - 120));
  await p.waitForSelector("#fab-cinema.is-on", { timeout: 12000 }).catch(()=>{});
  await p.waitForTimeout(3500);
  await p.screenshot({ path: "live2-fab.png" });
  console.log(JSON.stringify({ status: out.status, state: out.state, errors: out.errors, cache: out.headers["cache-control"], etag: out.headers["etag"], lastModified: out.headers["last-modified"] }, null, 2));
  await b.close();
})();
