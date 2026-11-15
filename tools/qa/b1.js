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
  await p.waitForTimeout(4900);
  await p.screenshot({ path: path.join(OUT, 'b-hero.png') });
  // hero wordmark tilt
  await p.mouse.move(300, 320);
  await p.waitForTimeout(500);
  await p.mouse.move(1100, 620);
  await p.waitForTimeout(700);
  out.heroWordTransform = await p.evaluate(() => getComputedStyle(document.querySelector('.wordmark')).transform);
  await p.screenshot({ path: path.join(OUT, 'b-hero-tilt.png') });
  // scroll hero exit
  await p.mouse.wheel(0, 700);
  await p.waitForTimeout(900);
  out.heroExit = await p.evaluate(() => ({ transform: getComputedStyle(document.querySelector('.hero-inner')).transform, opacity: getComputedStyle(document.querySelector('.hero-inner')).opacity }));

  // kinetic band
  await p.evaluate(() => { const el = document.getElementById('kinetic'); window.scrollTo(0, el.offsetTop - 300); });
  await p.waitForTimeout(900);
  await p.screenshot({ path: path.join(OUT, 'b-kinetic.png') });
  out.kinetic = await p.evaluate(() => ({ words: document.querySelectorAll('.kinetic-word').length, transform: document.querySelector('#kinetic-track').style.transform }));

  // coverflow
  await p.evaluate(() => { const el = document.getElementById('life'); window.scrollTo(0, el.offsetTop - 60); });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: path.join(OUT, 'b-life.png') });
  out.coverflow = await p.evaluate(() => ({
    figures: document.querySelectorAll('#coverflow-stage figure').length,
    active: document.querySelectorAll('#coverflow-stage figure.is-active').length,
    caption: document.querySelector('#cf-caption').textContent,
    index: document.querySelector('#cf-index').textContent,
    transforms: [...document.querySelectorAll('#coverflow-stage figure')].map(f => f.style.transform)
  }));
  // next button
  await p.click('[data-cf="next"]');
  await p.waitForTimeout(800);
  out.afterNext = await p.evaluate(() => ({ caption: document.querySelector('#cf-caption').textContent, index: document.querySelector('#cf-index').textContent }));
  await p.screenshot({ path: path.join(OUT, 'b-life-next.png') });
  // click active opens lightbox
  await p.click('#coverflow-stage figure.is-active button');
  await p.waitForTimeout(500);
  out.lightbox = await p.evaluate(() => ({ open: !document.getElementById('lightbox').hidden, cap: document.getElementById('lightbox-cap').textContent }));
  await p.keyboard.press('Escape');
  await p.waitForTimeout(300);

  // warp indicator: scroll to another section and capture flash
  await p.evaluate(() => { const el = document.getElementById('fab'); window.scrollTo(0, el.offsetTop - 60); });
  await p.waitForTimeout(120);
  out.warp = await p.evaluate(() => ({ on: document.getElementById('warp').classList.contains('is-on') }));
  await p.screenshot({ path: path.join(OUT, 'b-warp.png') });
  await p.waitForTimeout(1200);
  out.warpAfter = await p.evaluate(() => document.getElementById('warp').classList.contains('is-on'));

  // layout checks
  out.layout = await p.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - innerWidth,
    scrollH: document.documentElement.scrollHeight,
    kineticH: document.getElementById('kinetic').offsetHeight,
    coverflowH: document.getElementById('coverflow').offsetHeight
  }));
  await ctx.close();

  // mobile
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const mp = await mctx.newPage();
  mp.on('pageerror', e => out.errors.push('MOBILE ' + e.message));
  await mp.goto(URL + '?nocine=1', { waitUntil: 'load' });
  await mp.waitForTimeout(4600);
  await mp.evaluate(() => { const el = document.getElementById('life'); window.scrollTo(0, el.offsetTop - 50); });
  await mp.waitForTimeout(1200);
  await mp.screenshot({ path: path.join(OUT, 'b-m-life.png') });
  out.mobile = await mp.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth, figures: document.querySelectorAll('#coverflow-stage figure').length, kinetic: document.getElementById('kinetic').offsetHeight }));
  await mctx.close();

  // reduced
  const rctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const rp = await rctx.newPage();
  rp.on('pageerror', e => out.errors.push('RM ' + e.message));
  await rp.goto(URL + '?nocine=1', { waitUntil: 'load' });
  await rp.waitForTimeout(1700);
  await rp.evaluate(() => { const el = document.getElementById('life'); window.scrollTo(0, el.offsetTop - 60); });
  await rp.waitForTimeout(700);
  await rp.screenshot({ path: path.join(OUT, 'b-rm-life.png') });
  out.reduced = await rp.evaluate(() => ({ figures: document.querySelectorAll('#coverflow-stage figure').length, kineticTransform: document.querySelector('#kinetic-track').style.transform }));
  await rctx.close();

  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();
