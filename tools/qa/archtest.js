const { chromium } = require('playwright');
const path = require('path');
const URL = 'file:///' + path.resolve(__dirname, '../../index.html').replace(/\\/g, '/');
(async () => {
  const browser = await chromium.launch();
  const p = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(4500);
  await p.evaluate(() => { const el = document.getElementById('ai'); window.scrollTo(0, el.offsetTop + 200); });
  await p.waitForTimeout(1600);
  await p.screenshot({ path: path.join(__dirname, 'shots', 'x-arch-1.png') });

  const before = await p.evaluate(() => {
    const root = document.getElementById('arch-root');
    const btns = [...root.querySelectorAll('button')].map(b => (b.textContent || '').trim().slice(0, 22));
    return { buttons: btns, html: root.innerHTML.length, height: root.getBoundingClientRect().height };
  });

  // click train mode and replay, take screenshots
  const clicked = await p.evaluate(() => {
    const root = document.getElementById('arch-root');
    const find = re => [...root.querySelectorAll('button')].find(b => re.test(b.textContent || ''));
    const train = find(/训练|TRAIN/i); if (train) train.click();
    const replay = find(/重放|REPLAY/i); if (replay) replay.click();
    return { train: !!train, replay: !!replay };
  });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: path.join(__dirname, 'shots', 'x-arch-train.png') });

  // click stage rows (buttons with stage labels)
  const stageHit = await p.evaluate(() => {
    const root = document.getElementById('arch-root');
    const btns = [...root.querySelectorAll('button')].filter(b => /RMS|GQA|RoPE|SWIGLU|SOFTMAX|残差|投影|归一/i.test(b.textContent || ''));
    if (btns[2]) btns[2].click();
    return { candidates: btns.length, hit: btns[2] ? (btns[2].textContent || '').trim().slice(0, 20) : null };
  });
  await p.waitForTimeout(700);
  await p.screenshot({ path: path.join(__dirname, 'shots', 'x-arch-stage.png') });

  // switch language and theme
  await p.click('#lang-toggle');
  await p.waitForTimeout(900);
  const en = await p.evaluate(() => {
    const root = document.getElementById('arch-root');
    return { text: (root.innerText || '').slice(0, 240), lang: document.documentElement.lang };
  });
  await p.screenshot({ path: path.join(__dirname, 'shots', 'x-arch-en.png') });
  await p.click('#theme-toggle');
  await p.waitForTimeout(700);
  await p.evaluate(() => { const el = document.getElementById('ai'); window.scrollTo(0, el.offsetTop + 200); });
  await p.waitForTimeout(900);
  await p.screenshot({ path: path.join(__dirname, 'shots', 'x-arch-light.png') });
  const light = await p.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    rootBg: getComputedStyle(document.querySelector('.arch-root')).backgroundColor,
    overflow: document.documentElement.scrollWidth - window.innerWidth
  }));
  console.log(JSON.stringify({ errs, before, clicked, stageHit, en, light }, null, 2));
  await browser.close();
})();
