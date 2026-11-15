const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const checks = {};
  for (const [name, url] of [
    ["root", "https://ablazed-gold.github.io/"],
    ["lower", "https://ablazed-gold.github.io/golden/"],
    ["project", "https://ablazed-gold.github.io/Golden/"]
  ]) {
    await p.goto(url, { waitUntil: "load", timeout: 60000 });
    await p.waitForTimeout(4200);
    checks[name] = await p.evaluate(() => ({
      final: location.href,
      title: document.title,
      sections: document.querySelectorAll("main .sec").length,
      hero: !!document.querySelector(".wordmark-solid"),
      skillStage: !!document.querySelector('.skill-stage canvas[data-specimen="skills"]')
    }));
  }
  console.log(JSON.stringify(checks, null, 2));
  await b.close();
})();
