const { chromium } = require('playwright');
const path = require('path');
const URL = 'file:///' + path.resolve(__dirname, '../../index.html').replace(/\\/g, '/');

async function run(browser, reduced) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(reduced ? 1500 : 4200);
  await p.evaluate(() => { const el = document.getElementById('cube'); window.scrollTo(0, el.offsetTop - 70); });
  await p.waitForTimeout(800);
  const r = await p.evaluate(async () => {
    const root = document.getElementById('cube-root');
    const api = root.__goldenCube;
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const snap = () => ({
      state: api.state(),
      solved: api.isSolved(),
      moves: document.querySelector('[data-cube-moves]').textContent.trim(),
      time: document.querySelector('[data-cube-time]').textContent.trim()
    });
    const before = snap();
    const t0 = performance.now();
    api.scramble();
    // poll until scrambled or 8s
    let guard = 0;
    while (api.state() === 'scrambling' && guard++ < 200) await wait(50);
    const scrambleMs = Math.round(performance.now() - t0);
    const afterScramble = snap();
    const t1 = performance.now();
    api.solve();
    guard = 0;
    while (api.state() === 'solving' && guard++ < 300) await wait(50);
    const solveMs = Math.round(performance.now() - t1);
    const afterSolve = snap();
    // dispose + remount same canvas
    api.dispose();
    await wait(120);
    const api2 = window.GoldenCube.mount(root);
    await wait(300);
    return {
      before, scrambleMs, afterScramble, solveMs, afterSolve,
      remount: { ok: !!api2, state: api2 && api2.state && api2.state(), noWebgl: root.classList.contains('no-webgl'), canvas: !!root.querySelector('canvas') }
    };
  });
  await ctx.close();
  return { reduced: !!reduced, errs, r };
}

(async () => {
  const browser = await chromium.launch();
  const normal = await run(browser, false);
  const red = await run(browser, true);
  console.log(JSON.stringify({ normal, red }, null, 2));
  await browser.close();
})();
