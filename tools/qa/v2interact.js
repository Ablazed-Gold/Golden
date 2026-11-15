const { chromium } = require('playwright');
const path = require('path');
const URL = 'file:///' + path.resolve(__dirname, '../../index.html').replace(/\\/g, '/');
(async () => {
  const b = await chromium.launch();
  const out = { errors: [] };
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  p.on('pageerror', e => out.errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') out.errors.push(m.text()); });
  await p.goto(URL + '?nocine=1', { waitUntil: 'load' });
  await p.waitForTimeout(4600);

  // nav via rail (rail only becomes clickable past the hero)
  await p.mouse.wheel(0, 1200);
  await p.waitForTimeout(1000);
  await p.click('#rail a[data-rail="works"]');
  await p.waitForTimeout(1400);
  out.railJump = await p.evaluate(() => Math.round(document.getElementById('works').getBoundingClientRect().top));

  await p.click('#skill-rows .skill-row[data-skill="2"]');
  await p.waitForTimeout(500);
  out.skill = await p.evaluate(() => document.getElementById('skill-zh').textContent);

  await p.click('#work-rows .work-row[data-work="1"]');
  await p.waitForTimeout(500);
  out.work = await p.evaluate(() => document.getElementById('work-zh').textContent);

  await p.evaluate(() => { const el = document.getElementById('life'); window.scrollTo(0, el.offsetTop - 60); });
  await p.waitForTimeout(1200);
  await p.click('#coverflow-stage figure.is-active button');
  await p.waitForTimeout(400);
  out.lightbox = await p.evaluate(() => ({ open: !document.getElementById('lightbox').hidden, cap: document.getElementById('lightbox-cap').textContent }));
  await p.keyboard.press('Escape');
  await p.waitForTimeout(300);
  await p.click('#puzzle-scramble');
  await p.waitForTimeout(300);
  out.puzzle = await p.evaluate(() => document.querySelectorAll('#puzzle-grid .puzzle-tile').length);

  await p.click('#theme-toggle');
  await p.waitForTimeout(600);
  await p.click('#lang-toggle');
  await p.waitForTimeout(700);
  out.locale = await p.evaluate(() => ({ theme: document.documentElement.dataset.theme, lang: document.documentElement.lang, h2: document.querySelector('#about h2').textContent, title: document.title }));

  await p.evaluate(() => { const el = document.getElementById('cube'); window.scrollTo(0, el.offsetTop - 60); });
  await p.waitForTimeout(1200);
  const cubeReady = await p.evaluate(() => document.getElementById('cube-root').classList.contains('cube-ready'));
  await p.click('[data-cube-action="scramble"]');
  await p.waitForTimeout(3200);
  out.cube = { ready: cubeReady, state: await p.evaluate(() => document.querySelector('[data-cube-state]').textContent.trim()) };

  await p.evaluate(() => { const el = document.getElementById('fab'); window.scrollTo(0, el.offsetTop - 80); });
  await p.waitForTimeout(160);
  await p.screenshot({ path: path.join(__dirname, 'shots', 'v2-build-frame.png') });

  console.log(JSON.stringify(out, null, 2));
  await b.close();
})();
