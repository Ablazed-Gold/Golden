# GoldenCube — headless acceptance run

Target: `assets/js/cube.js` (read-only for this run — no source edits were made)
Fingerprint: 33,157 bytes, mtime `2026-11-15 09:29:21 +08:00`, sha256 `6CF5788C…D44AB5`
Syntax: `node --check assets/js/cube.js` → exit 0; 0 U+FFFD characters; `STATE_TEXT` / `aria-label` are clean UTF-8.

**Verdict: 35 / 38 checks pass, 0 console errors caused by the page, 3 real defects** (turn speed under reduced motion, HUD move count after scramble, same-canvas remount after `dispose()`). Details + minimal patches below; nothing was patched.

## Environment / how it was run

- Windows, Node 24.18.1, Playwright (installed at `research/scratch2/node_modules`), browser **Edge 157.0.4341.60** via `channel: 'msedge'` — the bundled Chromium build in the `ms-playwright` cache does not match the installed package, so Edge is used instead (WebGL works).
- Harness and test pages live in `%TEMP%\cube-accept\`; the repo was only read. Two contexts of the same suite:
  - **real page** — `http://127.0.0.1:8744/index.html`, mounted by `app.js` on `#cube-root`;
  - **isolated page** — a synthetic page with the same DOM contract (canvas, 3 buttons + a 4th spin button, 3 readouts) served from memory, used for the instrumentation that the real page would contaminate (rAF counters, dispose counters, pixel frame diffs).
- Timings are wall-clock `Date.now()` around clicks; the HUD timer is read from `[data-cube-time]`.
- Two harness bugs found and fixed before these numbers (so they are not source defects): the static server returned 403 for every asset (POSIX-vs-Windows path separator in the guard), and canvas screenshots were being contaminated by the HUD/action overlays. Overlays are made transparent (`opacity:0`, still clickable) for every pixel measurement.

## Result table

| # | Case | Result | Measured |
| --- | --- | --- | --- |
| A1 | mount: api keys, `cube-ready`, backing store = CSS × dpr(≤2) | PASS | 520×520 css 520×520 dpr 1; api = `dispose,isSolved,reset,scramble,solve,spin,state,turn` |
| A2 | canvas has real pixels after mount | PASS | cube = 18.07 % of canvas; faces present: paper/teal/signal/steel; body 24,571 px |
| A3 | camera fit (margin 1.2) leaves air | PASS | margins L 17.5 / T 21.2 / R 19.2 / B 14.4 % |
| A4 | `api.scramble()` accepted | PASS | returned `true` |
| A5 | scramble → SCRAMBLED, not solved, timer starts | PASS | 2,413 ms of turns; phase `scrambled`; timer 00.31 s after 350 ms |
| A6 | HUD MOVES after scramble reports the applied moves | **FAIL (P2)** | `moves='00'` while 21–24 moves were applied |
| A6b | HUD MOVES counts down during `solve()` | PASS | `moves='21'`, phase `solving` |
| A7 | `api.solve()` accepted after scramble (Lead fix) | PASS | returned `true` |
| A8 | solve → SOLVED: phase/readout/isSolved/`goldencube:solve` | PASS | 4,445 ms of turns; moves `00`; event `{time: 4781.5, state: "solved"}` |
| A9 | timer = real scramble→solve seconds | PASS | HUD 04.78 s vs wall 4.80 s (Δ 0.02 s) |
| A10 | `turn()` counts a move, rejects bad face, `reset()` → solved + 00.00 | PASS | turn moves `01`; reset `solved=true 00 00.00` |
| A20 | `dispose()` idempotent, clears root hooks/canvas | PASS | no throw ×3; classes cleared; no stray canvas |
| A11 | idle spin after 4 s; `spin(false)` freezes; spin button toggle | PASS | spinning, frozen, aria-pressed false→true, restart all true |
| A12 | touch: horizontal drag orbits, vertical drag does not | PASS | `touch-action: pan-y`, `defaultPrevented=false`, hOrbit=true, vOrbit=false |
| A13 | off-screen pause / on-screen resume | PASS | rAF 2833 → 2834 (paused) → 2918 (resumed) |
| A14 | `document.hidden` pause / resume | PASS | rAF 2918 → 2918 (paused) → 2986 |
| A19 | ResizeObserver re-sizes and keeps drawing | PASS | 520×520 → 320×400 css 320×400, cube 14.68 % |
| A15 | churn 10× → 3 geometries + 8 materials disposed per teardown, renderer + context released | PASS | per dispose: geo 3, mat 8, `renderer.dispose` 1, `forceContextLoss` 1; renderers created 10; stray canvases 0 |
| A16 | churn 10× → no RAF growth, no leaked listeners | PASS | rAF flat 3156→3156; `document` listeners identical; 0 listeners on the torn-down canvas (CDP `getEventListeners`) |
| A18 | same-canvas remount after `dispose()` is alive | **FAIL (P3)** | `first=unavailable second=unavailable no-webgl=true cube=0 %` |
| B1 | reduced motion: no idle spin, spin starts off | PASS | `aria-pressed=false`, frames identical over 700 ms |
| B2 | reduced motion: instant turns | **FAIL (P1)** | scramble 2,144 ms, solve 3,874 ms — same as full motion |
| C1 | no WebGL: stub + `.no-webgl` + NO WEBGL readouts, no throw | PASS | class set, `cube-ready` removed, phase `unavailable`, buttons are no-op, no pageerror |
| D1 | real page mounts on `#cube-root` | PASS | `GoldenCube.mount(#cube-root)` ran at boot |
| D2 | real page sizing / class contract | PASS | 638×638 css 638×638 dpr 1, `cube-ready`, `touch-action: pan-y` |
| D3 | real page: cube painted with palette faces | PASS | cube 18.08 % of canvas; paper/teal/signal; body 39,329 px |
| D3b | cube clears the overlaid HUD (top) and action bar (bottom) | PASS | cube top 21.9 % vs HUD band 8.4 %; cube bottom 16.3 % vs bar 9.1 % |
| D4 | real page: scramble → SCRAMBLED with a live timer | PASS | 2,381 ms; state 乱序 / SCRAMBLED; timer 00.41 s (MOVES reads `00` — same P2) |
| D5 | real page: solve → SOLVED, event + `.is-solved` flash | PASS | 4,766 ms; moves `00`; timer 04.77 s; event fired; `class="cube-stage cube-ready is-solved"` |
| D6 | real page: HUD timer == wall clock | PASS | 04.77 s vs 4.77 s |
| D13 | `turn()/spin()/reset()` on the real page (no spin button) | PASS | turns true, bad face false, spin false→true→false, moves `02`, reset `solved 00 00.00` |
| D7 | keyboard: Enter on focused scramble button | PASS | state 乱序中 / SCRAMBLING |
| D8 | wheel scrolls the page, no wheel listener | PASS | `scrollY` 4526 → 4905; no `wheel` listener on the canvas |
| D9 | vertical touch drag leaves scrolling to the page | PASS (limited) | `scrollY` unchanged for synthetic pointer events — the real proof is D10 |
| D10 | `touch-action: pan-y`, pointer moves never `preventDefault`ed | PASS | `pan-y`, `defaultPrevented=false` |
| D11 | resize 1440×900 → 390×844 | PASS | 638×638 → 353×371 (css 353×371), cube 21 % |
| D12 | no console/page errors caused by the real page | PASS | none (2 messages belong to other contexts: an ISO favicon 404 and the deliberate no-WebGL context) |

Notes: `A5`/`D4` prove the timer is *running*, not that it shows a number at the exact instant of the state flip — the HUD only repaints at ~10 Hz, so it reads `00.00` for up to ~100 ms after `scramble()` finishes. That is expected, not a defect.

## Defects (not patched — minimal patches only)

### P1 — `prefers-reduced-motion` does not shorten face turns (spec violation)

- Where: `assets/js/cube.js:364`
  `dur: mv.dur != null ? mv.dur : (q === 2 ? TURN_MS_DOUBLE : TURN_MS),`
- Repro: context with `reducedMotion: 'reduce'` → click scramble → 2,144 ms; solve → 3,874 ms (same as full motion). Idle spin is correctly off, and `reset()` is correctly instant (`line 558`), so only turns are affected.
- Impact: reduced-motion users still get 20+ animated turns per scramble/solve.
- Minimal patch (one line):

```js
dur: reduced ? 0 : (mv.dur != null ? mv.dur : (q === 2 ? TURN_MS_DOUBLE : TURN_MS)),
```

  The existing `if (anim.dur <= 0) { pivot.rotation[...] = angle; finishTurn(); }` (line ~369) and the `do { startTurn(...) } while (!anim && queue.length)` drain in `update()` already handle zero duration, so the whole scramble/solve collapses into effectively one frame. Expected after fix: both under 100 ms.

### P2 — HUD `[data-cube-moves]` reads `00` after a scramble

- Where: `assets/js/cube.js:284`
  `return sequence === 'solve' ? solveLeft : history.length;`
  Scramble records its moves in `scrambleMoves[]` (`line 500`) but `displayMoves()` still only reads `history`, which stays empty because scramble moves are not `manual` turns (`line 392`).
- Repro: mount → click scramble → wait for 乱序 / SCRAMBLED → MOVES shows `00` although 21–24 turns were applied (A6, D4). During `solve()` the countdown is correct (`21` at A6b) because that branch uses `solveLeft`.
- Impact: the HUD's "MOVES" field is wrong exactly when a reader looks at it after scrambling; it looks like the cube was solved in 0 moves.
- Minimal patch (one line):

```js
return sequence === 'solve' ? solveLeft : history.length + scrambleMoves.length;
```

  After the fix: scramble → `21`…`24`, manual turns add on top, solve counts down (unchanged), `reset()` → `00`.

### P3 — a remount on the same (author-provided) canvas is permanently dead

- Where: `assets/js/cube.js:877-878`
  `renderer.dispose();`
  `if (renderer.forceContextLoss) renderer.forceContextLoss();`
- Repro: `mount(root); api.dispose(); mount(root)` on a root that already contains `<canvas class="cube-canvas">` → the second mount takes the WebGL-failure path: `root.classList` gets `no-webgl`, `data-cube-phase="unavailable"`, `api.state() === 'unavailable'`, canvas paints nothing (A18: `first=unavailable second=unavailable no-webgl=true cube=0 %`). `forceContextLoss()` permanently loses that canvas's context; `mount()` then gets a lost context and falls back to the stub.
- Impact: latent on the current page (`app.js` mounts exactly once at boot), but any remount of `#cube-root` — bfcache restore, a future SPA navigation, hot reload, or a Lead-side retry — leaves the section showing the no-WebGL state until a full page reload. The 10× churn test passes only because those mounts use freshly created canvases that `dispose()` removes (`ownCanvas` path).
- Minimal patch (guard the loss to canvases we own and will remove):

```js
try {
  renderer.dispose();
  if (ownCanvas && renderer.forceContextLoss) renderer.forceContextLoss();
} catch (e) {}
```

  With `ownCanvas === false` the context is released when the canvas is GC'd; a fresh `WebGLRenderer` can then reuse the existing context on remount. Caveat: I could not verify this fix under the read-only mandate — it needs a one-line change plus a re-run of check A18 (`mount → dispose → mount` on `#iso-root`). If the Lead prefers a hard release for the author-provided canvas too, the alternative is to replace the canvas node inside `dispose()` (swap in a fresh `<canvas class="cube-canvas">`), which is more code and moves DOM the Lead owns.

## Not covered / honest limits

- Browsers: only Chromium (Edge 157) headless. Not tested: Firefox, Safari/iOS (WebGL context-loss behaviour and `touch-action` there are unverified).
- Real touch scrolling: headless synthetic `PointerEvent`s do not drive native scrolling, so D9 cannot prove scroll-through by itself. The evidence is D10 (`touch-action: pan-y` computed on the live canvas, no `preventDefault` on pointer moves) plus the vertical-drag-ignored check in A12. Real-device confirmation is still worth one manual pass.
- Real GPU context-loss events (`webglcontextlost` from the driver) are not simulated; only the deliberate `forceContextLoss` path (P3) is covered.
- Keyboard: only `Enter` on a `<button>` was exercised; `Space` is native button behaviour and was not asserted separately.
- The repo test page `assets/js/cube.standalone.html` is currently **invalid** — an earlier PowerShell text-replace of mine double-encoded it and dropped a quote in its inline script (`|| '—');` lost its closing quote), so its inline script throws. It is not referenced by `index.html` and does not affect the site. Recommend deleting it, or I can rewrite it cleanly on request (no writes made under this mandate).
