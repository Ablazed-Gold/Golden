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
  await p.screenshot({ path: path.join(OUT, 't-hero-a.png') });
  await p.waitForTimeout(700);
  await p.screenshot({ path: path.join(OUT, 't-hero-b.png') });
  out.hero = await p.evaluate(() => ({
    split: document.querySelectorAll('.hero .split').length,
    chars: document.querySelectorAll('.hero .split .ch').length,
    typed: document.querySelectorAll('.hero .split.is-typing').length,
    word: document.querySelector('.wordmark-solid').textContent
  }));

  // capture mid-animation for about and ai
  for (const id of ['about', 'ai', 'fab', 'life']) {
    await p.evaluate(i => { const el = document.getElementById(i); window.scrollTo(0, el.offsetTop - 60); }, id);
    await p.waitForTimeout(260);
    await p.screenshot({ path: path.join(OUT, 't-' + id + '-mid.png') });
    await p.waitForTimeout(1600);
    await p.screenshot({ path: path.join(OUT, 't-' + id + '-end.png') });
    const st = await p.evaluate(i => {
      const sec = document.getElementById(i);
      const splits = sec.querySelectorAll('.split');
      const typed = sec.querySelectorAll('.split.is-typing');
      return { id: i, splits: splits.length, typed: typed.length, firstCharOpacity: splits[0] ? getComputedStyle(splits[0].querySelector('.ch')).opacity : null };
    }, id);
    out[id] = st;
  }

  // wordmark stability after typing
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(1200);
  const samples = [];
  for (let i = 0; i < 6; i++) {
    samples.push(await p.evaluate(() => ({ t: document.querySelector('.wordmark-solid').textContent, tr: getComputedStyle(document.querySelector('.wordmark-solid')).transform })));
    await p.waitForTimeout(160);
  }
  out.wordmarkStable = samples;

  // english switch, layout check
  await p.click('#lang-toggle');
  await p.waitForTimeout(1400);
  await p.screenshot({ path: path.join(OUT, 't-en.png') });
  out.en = await p.evaluate(() => ({
    lang: document.documentElement.lang,
    h2: document.querySelector('#about h2').textContent,
    chars: document.querySelectorAll('#about h2 .ch').length,
    typed: document.querySelectorAll('#about h2.is-typing').length,
    overflow: document.documentElement.scrollWidth - innerWidth
  }));
  await p.click('#lang-toggle');
  await p.waitForTimeout(600);

  // reduced motion
  const rctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const rp = await rctx.newPage();
  rp.on('pageerror', e => out.errors.push('RM ' + e.message));
  await rp.goto(URL + '?nocine=1', { waitUntil: 'load' });
  await rp.waitForTimeout(1600);
  await rp.evaluate(() => { const el = document.getElementById('about'); window.scrollTo(0, el.offsetTop - 60); });
  await rp.waitForTimeout(800);
  await rp.screenshot({ path: path.join(OUT, 't-rm.png') });
  out.reduced = await rp.evaluate(() => ({ split: document.querySelectorAll('.split').length, chOpacity: getComputedStyle(document.querySelector('.about-lead .ch')).opacity }));
  await rctx.close();

  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();
