# GoldenArch · integration notes

`assets/js/arch.js` + `assets/css/arch.css` — an animated, interactive
decoder-only Transformer schematic (RMSNorm · RoPE · GQA + QK-norm · SwiGLU ·
KV cache · tied embeddings · optional MoE). No model or project names appear in
the UI.

## Integration (Lead)

1. In `<head>`, after `main.css`:
   `<link rel="stylesheet" href="assets/css/arch.css">`
2. Before `app.js` (classic script, no modules, works from `file://`):
   `<script src="assets/js/arch.js"></script>`
3. Page markup (already agreed): `<div class="arch-root" id="arch-root"></div>`.
4. Call after DOM ready — the module does **not** auto-mount:

```js
var api = window.GoldenArch.mount(document.getElementById('arch-root'), {
  lang: document.documentElement.lang === 'en' ? 'en' : 'zh',
  theme: document.documentElement.dataset.theme || 'dark',
  reduce: null            // null = follow prefers-reduced-motion
});
// later, when the site toggles language / theme:
api.setLang('en');        // safe any time after mount
api.setTheme('light');    // stores data-arch-theme; colours follow html[data-theme]
// off-screen / on-screen:
api.pause(); api.resume();
// teardown:
api.dispose();
```

`mount` is idempotent (a second call disposes the previous instance) and returns
a no-op API instead of throwing when the root is missing. `dispose()` removes
every listener, observer, rAF and the injected DOM.

## Theme / colour

All colours come from main.css tokens on `:root`, so the module follows
`html[data-theme="light"]` automatically. `setTheme()` only records the value
(`data-arch-theme`) for the host — the page must still switch `html[data-theme]`.

## Reduced motion

`opts.reduce === true` or `prefers-reduced-motion: reduce` → static diagram
(no autoplay, no pulses/blinks/sweep, all stages readable). Controls still work;
an explicit Play starts the highlight sequence with transitions disabled.

## Responsive

Full layout (main stream + magnified block panel) down to a root width of 720px.
Below that the SVG crops to the main stream and the internals panel is hidden
(per spec); the detail card, controls, mask, KV strip and training chips stay.

## Verification

`cd research/arch && npm install && node test.js` (Playwright 1.49.1, cached
Chromium). 42 checks: render, play/pause, TRAIN mode, hover/click details,
setLang, 1440/1024/390/360 no overflow, reduced motion, dispose/rAF, idempotent
mount, KV growth, mask sweep, no console/page errors.

Screenshots: `shot-desktop-dark.png`, `shot-desktop-light.png`, `shot-train.png`,
`shot-mobile.png` (+ `shot-reduced.png`, `shot-tablet-1024.png`).

## Known limits

- Stage rows in the SVG are pointer-clickable; keyboard users get the same
  bilingual notes through the four training-stage buttons and the controls
  (avoids adding ~20 tab stops inside the drawing).
- Code-like micro-labels (`q_proj`, `(B, T, V)`, `FEED-FORWARD`, `TOP-1`, `×N`)
  stay Latin in both languages, as on the rest of the site; primary stage names,
  controls and detail copy swap with `setLang`.
- Loss trace is intentionally unitless (no invented numbers).
- Uses CSS `:where()` in one reset rule (modern evergreen browsers only).
