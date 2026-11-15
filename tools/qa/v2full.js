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
  await p.goto(URL + '?nocine=1', { waitUntil: 'load' });
  await p.waitForTimeout(4700);
  // entrance frames for arena / community / works
  for (const id of ['arena', 'life', 'works']) {
    await p.evaluate(i => { const el = document.getElementById(i); window.scrollTo(0, el.offsetTop - 120); }, id);
    await p.waitForTimeout(140);
    await p.screenshot({ path: path.join(OUT, 'v2-' + id + '-mid.png') });
    await p.waitForTimeout(1200);
    await p.screenshot({ path: path.join(OUT, 'v2-' + id + '.png') });
  }
  // full section screenshots for community/life
  for (const id of ['life', 'contact', 'cube', 'fab']) {
    await p.evaluate(i => { const el = document.getElementById(i); window.scrollTo(0, el.offsetTop - 60); }, id);
    await p.waitForTimeout(1200);
    const el = await p.$('#' + id);
    await el.screenshot({ path: path.join(OUT, 'v2-full-' + id + '.png') });
  }
  // light theme
  await p.click('#theme-toggle');
  await p.waitForTimeout(700);
  for (const id of ['about', 'ai', 'life']) {
    await p.evaluate(i => { const el = document.getElementById(i); window.scrollTo(0, el.offsetTop - 60); }, id);
    await p.waitForTimeout(1100);
    await p.screenshot({ path: path.join(OUT, 'v2-light-' + id + '.png') });
  }
  await p.click('#theme-toggle');
  await ctx.close();

  // mobile
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const mp = await mctx.newPage();
  mp.on('pageerror', e => out.errors.push('MOBILE ' + e.message));
  await mp.goto(URL + '?nocine=1', { waitUntil: 'load' });
  await mp.waitForTimeout(4600);
  await mp.screenshot({ path: path.join(OUT, 'v2-m-hero.png') });
  for (const id of ['about', 'life', 'contact']) {
    await mp.evaluate(i => { const el = document.getElementById(i); window.scrollTo(0, el.offsetTop - 50); }, id);
    await mp.waitForTimeout(1000);
    await mp.screenshot({ path: path.join(OUT, 'v2-m-' + id + '.png') });
  }
  out.mobile = await mp.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - innerWidth,
    inner: innerWidth,
    constructDisplay: getComputedStyle(document.getElementById('construct-canvas')).display,
    railDisplay: getComputedStyle(document.getElementById('rail')).display,
    scrollH: document.documentElement.scrollHeight
  }));
  await mctx.close();

  // reduced motion
  const rctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const rp = await rctx.newPage();
  rp.on('pageerror', e => out.errors.push('RM ' + e.message));
  await rp.goto(URL + '?nocine=1', { waitUntil: 'load' });
  await rp.waitForTimeout(1700);
  await rp.evaluate(() => { const el = document.getElementById('about'); window.scrollTo(0, el.offsetTop - 60); });
  await rp.waitForTimeout(700);
  await rp.screenshot({ path: path.join(OUT, 'v2-rm.png') });
  out.reduced = await rp.evaluate(() => ({
    ready: document.body.classList.contains('is-ready'),
    constructOn: document.getElementById('construct-canvas').classList.contains('is-on'),
    aboutIn: document.getElementById('about').classList.contains('is-in'),
    portraitOpacity: getComputedStyle(document.querySelector('.portrait')).opacity
  }));
  await rctx.close();

  // no webgl
  const nctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await nctx.addInitScript(() => {
    const o = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (t) { if (/webgl/i.test(String(t))) return null; return o.apply(this, arguments); };
  });
  const np = await nctx.newPage();
  np.on('pageerror', e => out.errors.push('NW ' + e.message));
  np.on('console', m => { if (m.type() === 'error') out.errors.push('NW CONSOLE ' + m.text()); });
  await np.goto(URL + '?nocine=1', { waitUntil: 'load' });
  await np.waitForTimeout(5200);
  out.noWebgl = await np.evaluate(() => ({ ready: document.body.classList.contains('is-ready'), cubeNoWebgl: document.getElementById('cube-root').classList.contains('no-webgl') }));
  await nctx.close();

  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();
