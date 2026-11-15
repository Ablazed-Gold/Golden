const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const URL = 'file:///' + path.resolve(__dirname, '../../index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const out = { errors: [] };
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  p.on('console', m => { if (m.type() === 'error') out.errors.push('CONSOLE: ' + m.text()); });
  p.on('pageerror', e => out.errors.push('PAGEERROR: ' + e.message));
  p.on('requestfailed', r => out.errors.push('REQFAIL: ' + r.url()));
  await p.goto(URL + '?nocine=1', { waitUntil: 'load' });
  await p.waitForTimeout(4800);
  await p.screenshot({ path: path.join(OUT, 'z-hero.png') });

  const ids = ['about', 'skills', 'works', 'ai', 'arena', 'cube', 'fab', 'life', 'contact'];
  for (const id of ids) {
    await p.evaluate(i => { const el = document.getElementById(i); window.scrollTo(0, el.offsetTop - 60); }, id);
    await p.waitForTimeout(1400);
    await p.screenshot({ path: path.join(OUT, 'z2-' + id + '.png') });
  }
  // specimens pixel check
  out.canvases = await p.evaluate(() => [...document.querySelectorAll('.specimen-canvas')].map(cv => {
    const g = document.createElement('canvas'); g.width = 160; g.height = 120;
    const cx = g.getContext('2d'); cx.drawImage(cv, 0, 0, 160, 120);
    const d = cx.getImageData(0, 0, 160, 120).data; let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 8) n++;
    return { kind: cv.dataset.specimen, nonEmpty: n, w: cv.width, h: cv.height };
  }));
  // fps estimate
  const fps = await p.evaluate(() => new Promise(res => {
    let n = 0; const t0 = performance.now();
    (function f() { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(Math.round(n / 2)); })();
  }));
  out.fpsHero = fps;
  // light theme specimens
  await p.click('#theme-toggle');
  await p.waitForTimeout(700);
  await p.evaluate(() => { const el = document.getElementById('fab'); window.scrollTo(0, el.offsetTop - 60); });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: path.join(OUT, 'z2-light-fab.png') });
  await p.evaluate(() => { const el = document.getElementById('skills'); window.scrollTo(0, el.offsetTop - 60); });
  await p.waitForTimeout(1000);
  await p.screenshot({ path: path.join(OUT, 'z2-light-skills.png') });
  await p.click('#theme-toggle');
  await ctx.close();

  // mobile fallback
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const mp = await mctx.newPage();
  mp.on('pageerror', e => out.errors.push('MOBILE ' + e.message));
  await mp.goto(URL + '?nocine=1', { waitUntil: 'load' });
  await mp.waitForTimeout(4600);
  await mp.evaluate(() => { const el = document.getElementById('skills'); window.scrollTo(0, el.offsetTop - 50); });
  await mp.waitForTimeout(1000);
  await mp.screenshot({ path: path.join(OUT, 'z2-m-skills.png') });
  out.mobile = await mp.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - innerWidth,
    specimen: document.querySelectorAll('.has-specimen').length,
    fallbackVisible: [...document.querySelectorAll('.specimen-fallback')].map(e => getComputedStyle(e).display)
  }));
  await mctx.close();

  // reduced motion
  const rctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const rp = await rctx.newPage();
  rp.on('pageerror', e => out.errors.push('RM ' + e.message));
  await rp.goto(URL + '?nocine=1', { waitUntil: 'load' });
  await rp.waitForTimeout(1700);
  await rp.evaluate(() => { const el = document.getElementById('fab'); window.scrollTo(0, el.offsetTop - 60); });
  await rp.waitForTimeout(800);
  await rp.screenshot({ path: path.join(OUT, 'z2-rm-fab.png') });
  out.reduced = await rp.evaluate(() => ({ ready: document.body.classList.contains('is-ready'), specimen: document.querySelectorAll('.has-specimen').length }));
  await rctx.close();

  // no webgl
  const nctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await nctx.addInitScript(() => {
    const o = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (t) { if (/webgl/i.test(String(t))) return null; return o.apply(this, arguments); };
  });
  const np = await nctx.newPage();
  np.on('pageerror', e => out.errors.push('NW ' + e.message));
  await np.goto(URL + '?nocine=1', { waitUntil: 'load' });
  await np.waitForTimeout(5200);
  out.noWebgl = await np.evaluate(() => ({ ready: document.body.classList.contains('is-ready'), specimen: document.querySelectorAll('.has-specimen').length, cubeNoWebgl: document.getElementById('cube-root').classList.contains('no-webgl') }));
  await nctx.close();

  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();
