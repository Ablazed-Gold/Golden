const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = path.resolve(__dirname, '../..');
const URL = 'file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const PREV = path.join(ROOT, 'preview');

(async () => {
  fs.mkdirSync(PREV, { recursive: true });
  const browser = await chromium.launch();
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  p.on('requestfailed', r => errors.push('REQFAIL: ' + r.url()));
  await p.goto(URL + '?nocine=1', { waitUntil: 'load' });
  await p.waitForTimeout(4800);
  await p.screenshot({ path: path.join(PREV, 'hero.png') });

  const shots = [
    ['about', 'about'], ['skills', 'skills'], ['works', 'works'], ['ai', 'model'],
    ['arena', 'arena'], ['kinetic', 'kinetic'], ['life', 'life']
  ];
  for (const [id, name] of shots) {
    await p.evaluate(i => {
      const el = document.getElementById(i);
      const off = i === 'kinetic' ? 280 : 60;
      window.scrollTo(0, el.offsetTop - off);
    }, id);
    await p.waitForTimeout(1500);
    await p.screenshot({ path: path.join(PREV, name + '.png') });
  }
  await p.screenshot({ path: path.join(PREV, 'full.png'), fullPage: true });

  const checks = await p.evaluate(() => {
    const spec = [...document.querySelectorAll('.specimen-canvas')].map(cv => {
      const g = document.createElement('canvas'); g.width = 120; g.height = 90;
      const cx = g.getContext('2d'); cx.drawImage(cv, 0, 0, 120, 90);
      const d = cx.getImageData(0, 0, 120, 90).data; let n = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 8) n++;
      return { kind: cv.dataset.specimen, nonEmpty: n };
    });
    return {
      booted: document.body.classList.contains('is-ready'),
      sections: document.querySelectorAll('main .sec').length,
      nav: document.querySelectorAll('#nav a').length,
      rail: document.querySelectorAll('#rail a').length,
      arch: !!document.querySelector('#arch-root svg'),
      archStages: document.querySelectorAll('#arch-root [data-stage]').length,
      construct: !!document.getElementById('construct-canvas'),
      specimens: spec,
      cube: document.getElementById('cube-root').classList.contains('cube-ready'),
      coverflow: document.querySelectorAll('#coverflow-stage figure').length,
      coverflowActive: document.querySelectorAll('#coverflow-stage figure.is-active').length,
      kineticWords: document.querySelectorAll('.kinetic-word').length,
      puzzle: document.querySelectorAll('#puzzle-grid .puzzle-tile').length,
      tiltTargets: document.querySelectorAll('[data-tilt]').length,
      avatar: !!document.querySelector('.portrait-frame img'),
      note: (document.querySelector('.portrait-note') || {}).textContent,
      fonts: document.fonts.check('800 16px Saira'),
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      scrollH: document.documentElement.scrollHeight,
      title: document.title
    };
  });

  await p.click('#theme-toggle');
  await p.waitForTimeout(900);
  await p.evaluate(() => { const el = document.getElementById('fab'); window.scrollTo(0, el.offsetTop - 60); });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: path.join(PREV, 'light-fab.png') });
  await p.evaluate(() => { const el = document.getElementById('about'); window.scrollTo(0, el.offsetTop - 60); });
  await p.waitForTimeout(1000);
  await p.screenshot({ path: path.join(PREV, 'light-about.png') });
  await p.click('#theme-toggle');
  await ctx.close();

  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const mp = await mctx.newPage();
  mp.on('pageerror', e => errors.push('MOBILE PAGEERROR: ' + e.message));
  await mp.goto(URL + '?nocine=1', { waitUntil: 'load' });
  await mp.waitForTimeout(4600);
  await mp.screenshot({ path: path.join(PREV, 'mobile.png') });
  const mchecks = await mp.evaluate(() => ({ ready: document.body.classList.contains('is-ready'), overflow: document.documentElement.scrollWidth - window.innerWidth, inner: window.innerWidth }));
  await mctx.close();

  console.log(JSON.stringify({ errors, checks, mchecks }, null, 2));
  await browser.close();
})();
