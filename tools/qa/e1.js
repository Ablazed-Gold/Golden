const { chromium } = require("playwright");
const path = require("path");
const URL = "file:///" + path.resolve(__dirname, "../../index.html").replace(/\\\\/g, "/");
(async () => {
  const b = await chromium.launch();
  const out = { errors: [] };
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  p.on("pageerror", e => out.errors.push(e.message));
  p.on("console", m => { if (m.type() === "error") out.errors.push(m.text()); });
  await p.goto(URL + "?nocine=1", { waitUntil: "load" });
  await p.waitForTimeout(4700);
  await p.evaluate(() => window.scrollTo(0, document.getElementById("skills").offsetTop - 60));
  await p.waitForTimeout(1600);
  await p.screenshot({ path: "shots/e-skills.png" });
  out.skills = await p.evaluate(() => ({ canvases: [...document.querySelectorAll(".skill-stage .specimen-canvas")].map(c => ({ w: c.width, h: c.height, display: getComputedStyle(c).display })), has: document.querySelectorAll(".has-specimen").length, count: document.getElementById("skill-count").textContent }));
  await p.click('#skill-rows .skill-row[data-skill="1"]');
  await p.waitForTimeout(1100);
  await p.screenshot({ path: "shots/e-skills2.png" });
  await p.click('#skill-rows .skill-row[data-skill="2"]');
  await p.waitForTimeout(1100);
  await p.screenshot({ path: "shots/e-skills3.png" });
  await p.click('#skill-rows .skill-row[data-skill="3"]');
  await p.waitForTimeout(1100);
  await p.screenshot({ path: "shots/e-skills4.png" });
  await p.evaluate(() => window.scrollTo(0, document.getElementById("works").offsetTop - 60));
  await p.waitForTimeout(1500);
  await p.screenshot({ path: "shots/e-works.png" });
  out.works = await p.evaluate(() => ({ canvases: [...document.querySelectorAll(".work-stage .specimen-canvas")].map(c => ({ w: c.width, h: c.height, display: getComputedStyle(c).display })) }));
  for (const i of [1,2,3]) {
    await p.click(`#work-rows .work-row[data-work="${i}"]`);
    await p.waitForTimeout(1000);
    await p.screenshot({ path: `shots/e-works${i+1}.png` });
  }
  out.final = await p.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth, count: document.getElementById("work-count").textContent }));
  console.log(JSON.stringify(out, null, 2));
  await b.close();
})();
