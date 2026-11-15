/* =============================================================================
   GoldenCube — a real 3×3×3 Rubik's cube for the Endfield-styled blog.
   Classic script, no modules, no build step, no dependencies. Expects the
   vendored global THREE (assets/vendor/three.min.js, r149) and nothing else.

     var api = window.GoldenCube.mount(rootElement, { spin: true });

   The root may contain a <canvas class="cube-canvas">, buttons carrying
   [data-cube-action="scramble|solve|reset|spin"] and the readouts
   [data-cube-time] / [data-cube-moves] / [data-cube-state]. Only the elements
   that actually exist are bound. api.dispose() removes every listener, timer,
   geometry and material.

   Palette is the site's, verbatim: body #161616, stickers paper #EDEDED,
   signal #FFFA00, mint #00FFA2, magenta #FF00F0, ice #7DE6FF, amber #FFB31F.
   Flat MeshBasicMaterial on purpose — no lights, no shading ramp, no gloss.
   ========================================================================== */
(function (global) {
  'use strict';

  if (global.GoldenCube) { return; }

  var PI = Math.PI;
  var HALF_PI = PI / 2;

  /* ---- palette ----------------------------------------------------------- */
  var BODY_HEX = 0x141414;
  var EDGE_HEX = 0x2b2b2b;
  var STICKER_HEX = {
    U: 0xe6e6e0, /* paper    */
    D: 0xffb31f, /* amber    */
    F: 0x2f8f74, /* teal     */
    R: 0xfffa00, /* signal   */
    B: 0x5c6b78, /* steel    */
    L: 0x7de6ff  /* ice      */
  };

   /* Face table: which axis, which layer of the 3×3×3, and the sign of one
     clockwise quarter turn around the positive axis (right-hand rule). */
  var FACES = {
    U: { axis: 'y', index: 1, layer: 1, dir: -1 },
    D: { axis: 'y', index: 1, layer: -1, dir: 1 },
    R: { axis: 'x', index: 0, layer: 1, dir: -1 },
    L: { axis: 'x', index: 0, layer: -1, dir: 1 },
    F: { axis: 'z', index: 2, layer: 1, dir: -1 },
    B: { axis: 'z', index: 2, layer: -1, dir: 1 }
  };
  var FACE_ORDER = ['U', 'D', 'L', 'R', 'F', 'B'];
  var AXIS_OF = { U: 'y', D: 'y', L: 'x', R: 'x', F: 'z', B: 'z' };

  /* One sticker plane per visible cubie face, rotated to look outward. */
  var STICKER_PLANES = [
    { axis: 'x', sign: 1, face: 'R', rx: 0, ry: HALF_PI },
    { axis: 'x', sign: -1, face: 'L', rx: 0, ry: -HALF_PI },
    { axis: 'y', sign: 1, face: 'U', rx: -HALF_PI, ry: 0 },
    { axis: 'y', sign: -1, face: 'D', rx: HALF_PI, ry: 0 },
    { axis: 'z', sign: 1, face: 'F', rx: 0, ry: 0 },
    { axis: 'z', sign: -1, face: 'B', rx: 0, ry: PI }
  ];

  var STATE_TEXT = {
    solved: '已复原 / SOLVED',
    scrambled: '乱序 / SCRAMBLED',
    scrambling: '乱序中 / SCRAMBLING',
    solving: '复原中 / SOLVING',
    turning: '转动 / TURNING',
    unavailable: '无 WebGL / NO WEBGL'
  };

  /* ---- metrics ----------------------------------------------------------- */
  var CUBIE_SIZE = 0.94;                 /* body edge, 0.06 gap between cubies  */
  var STICKER_SIZE = 0.76;               /* inset sticker — the bevel look      */
  var STICKER_LIFT = CUBIE_SIZE / 2 + 0.006;
  var CAM_FOV = 32;
  var CAM_RADIUS = 2.75;                 /* bounding sphere of the 3-unit block */
  var TURN_MS = 180;
  var TURN_MS_DOUBLE = 260;
  var SCRAMBLE_MS = 95;
  var SCRAMBLE_MS_DOUBLE = 120;
  var RESET_MS = 260;
  var IDLE_MS = 4000;
  var SPIN_SPEED = 0.16;                 /* rad per second, ~10°/s              */
  var MAX_DPR = 2;

  /* ---- helpers ----------------------------------------------------------- */
  function nowMs() {
    return global.performance && global.performance.now ? global.performance.now() : Date.now();
  }

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  /* cubic-bezier(0.7, 0, 0.2, 1) — the site's --ef-mech curve, sampled once
     into a lookup table and read back by bisection on x. */
  var MECH = (function () {
    var N = 33, xs = new Float32Array(N), ys = new Float32Array(N);
    var x1 = 0.7, y1 = 0, x2 = 0.2, y2 = 1;
    for (var i = 0; i < N; i++) {
      var t = i / (N - 1), m = 1 - t;
      xs[i] = 3 * m * m * t * x1 + 3 * m * t * t * x2 + t * t * t;
      ys[i] = 3 * m * m * t * y1 + 3 * m * t * t * y2 + t * t * t;
    }
    return function (p) {
      if (p <= 0) return 0;
      if (p >= 1) return 1;
      var lo = 0, hi = N - 1;
      while (hi - lo > 1) {
        var mid = (lo + hi) >> 1;
        if (xs[mid] < p) lo = mid; else hi = mid;
      }
      var span = (xs[hi] - xs[lo]) || 1;
      return ys[lo] + (ys[hi] - ys[lo]) * ((p - xs[lo]) / span);
    };
  })();

  /* Integer 90° rotation of a grid coordinate triple around one axis. */
  function rotateGrid(g, axisIndex, quarterTurns) {
    var k = ((quarterTurns % 4) + 4) % 4;
    if (k === 0) return;
    var a = (axisIndex + 1) % 3, b = (axisIndex + 2) % 3;
    var av = g[a], bv = g[b];
    if (k === 1) { g[a] = -bv; g[b] = av; }
    else if (k === 2) { g[a] = -av; g[b] = -bv; }
    else { g[a] = bv; g[b] = -av; }
  }

  function fmtTime(ms) {
    var v = Math.max(0, ms) / 1000;
    var s = v.toFixed(2);
    if (v < 9.995) s = '0' + s;
    return s;
  }

  function fmtMoves(n) {
    n = Math.max(0, n | 0);
    return n < 10 ? '0' + n : String(n);
  }

  /* ---- mount ------------------------------------------------------------- */

  function create(root, opts) {
    var doc = root && root.ownerDocument ? root.ownerDocument : document;
    var T = global.THREE;

    if (!root || !root.nodeType) { return stub(null); }
    if (!T || !T.WebGLRenderer || !T.Scene || !T.MeshBasicMaterial) {
      return fail(root, 'no-three');
    }

    /* -- 1. canvas -------------------------------------------------------- */
    var canvas = root.querySelector('canvas.cube-canvas') || root.querySelector('canvas');
    var ownCanvas = false;
    if (!canvas) {
      canvas = doc.createElement('canvas');
      canvas.className = 'cube-canvas';
      root.appendChild(canvas);
      ownCanvas = true;
    } else if (!canvas.classList.contains('cube-canvas')) {
      canvas.classList.add('cube-canvas');
    }
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.touchAction = 'pan-y';        /* vertical scroll stays the page's */
    canvas.style.userSelect = 'none';
    canvas.style.webkitUserSelect = 'none';
    if (!canvas.getAttribute('aria-label')) {
    canvas.setAttribute('aria-label', '可拖拽旋转的 3×3 魔方');
    }

    /* -- 2. renderer (the only step that realistically fails) ------------- */
    var renderer;
    try {
      renderer = new T.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
    } catch (err) {
      if (ownCanvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
      return fail(root, 'no-webgl');
    }
    try {
      renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, MAX_DPR));
      renderer.setClearColor(0x000000, 0);
      renderer.setSize(1, 1, false);
    } catch (err) {
      if (ownCanvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
      return fail(root, 'no-webgl');
    }

    /* -- 3. scene --------------------------------------------------------- */
    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(CAM_FOV, 1, 0.1, 100);
    var cubeGroup = new T.Group();
    var pivot = new T.Group();
    scene.add(cubeGroup);
    cubeGroup.add(pivot);

    var UNIT = {
      x: new T.Vector3(1, 0, 0),
      y: new T.Vector3(0, 1, 0),
      z: new T.Vector3(0, 0, 1)
    };
    var IDENTITY = new T.Quaternion();

    var bodyMat = new T.MeshBasicMaterial({ color: BODY_HEX });
    var edgeMat = new T.LineBasicMaterial({ color: EDGE_HEX });
    var stickerMat = {};
    var boxGeo = new T.BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE);
    var stickerGeo = new T.PlaneGeometry(STICKER_SIZE, STICKER_SIZE);
    var edgeGeo = new T.EdgesGeometry(boxGeo);
    for (var fi = 0; fi < FACE_ORDER.length; fi++) {
      stickerMat[FACE_ORDER[fi]] = new T.MeshBasicMaterial({ color: STICKER_HEX[FACE_ORDER[fi]] });
    }

    var cubies = [];
    for (var gx = -1; gx <= 1; gx++) {
      for (var gy = -1; gy <= 1; gy++) {
        for (var gz = -1; gz <= 1; gz++) {
          var cubie = new T.Mesh(boxGeo, bodyMat);
          cubie.position.set(gx, gy, gz);
          cubie.userData.g = [gx, gy, gz];
          cubie.userData.home = [gx, gy, gz];

          var edge = new T.LineSegments(edgeGeo, edgeMat);
          edge.scale.setScalar(1.002);          /* sit just off the body faces */
          cubie.add(edge);

          for (var si = 0; si < STICKER_PLANES.length; si++) {
            var sp = STICKER_PLANES[si];
            var coord = sp.axis === 'x' ? gx : (sp.axis === 'y' ? gy : gz);
            if (coord !== sp.sign) continue;
            var plane = new T.Mesh(stickerGeo, stickerMat[sp.face]);
            plane.position[sp.axis] = sp.sign * STICKER_LIFT;
            plane.rotation.x = sp.rx;
            plane.rotation.y = sp.ry;
            cubie.add(plane);
          }
          cubeGroup.add(cubie);
          cubies.push(cubie);
        }
      }
    }

    /* -- 4. DOM handles --------------------------------------------------- */
    var els = {
      time: root.querySelectorAll('[data-cube-time]'),
      moves: root.querySelectorAll('[data-cube-moves]'),
      state: root.querySelectorAll('[data-cube-state]')
    };

    var mq = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var reduced = !!(mq && mq.matches);

    /* -- 5. animation / session state ------------------------------------- */
    var spinEnabled = opts.spin !== false && !reduced;
    var theta = 0.62, phi = 0.42, dist = 9, aspect = 1;
    var queue = [];
    var anim = null;
    var resetAnim = null;
    var sequence = null;                 /* 'scramble' | 'solve' | null */
    var solveLeft = 0;
    var history = [];                    /* manual turns, newest last */
    var scrambleMoves = [];             /* the moves the last scramble applied */
    var state = '';
    var timerStart = 0;
    var timerFinal = 0;
    var timerRunning = false;
    var lastPaint = 0;
    var lastInteraction = nowMs();
    var dragging = null;
    var dirty = true;
    var rafId = 0;
    var lastFrame = 0;
    var visible = true;
    var disposed = false;

    /* -- 6. readouts ------------------------------------------------------ */
    function timerValue() {
      return timerRunning ? Math.max(0, nowMs() - timerStart) : timerFinal;
    }

    function displayMoves() {
      return sequence === 'solve' ? solveLeft : history.length + scrambleMoves.length;
    }

    function paintTime() {
      var txt = fmtTime(timerValue());
      for (var i = 0; i < els.time.length; i++) els.time[i].textContent = txt;
    }

    function paintMoves() {
      var txt = fmtMoves(displayMoves());
      for (var i = 0; i < els.moves.length; i++) els.moves[i].textContent = txt;
    }

    function paintAll() { paintTime(); paintMoves(); }

    function emit(name, detail) {
      try {
        if (!root.dispatchEvent) return;
        var ev;
        if (typeof global.CustomEvent === 'function') {
          ev = new global.CustomEvent('goldencube:' + name, { detail: detail, bubbles: true });
        } else if (doc.createEvent) {
          ev = doc.createEvent('CustomEvent');
          ev.initCustomEvent('goldencube:' + name, true, false, detail);
        }
        if (ev) root.dispatchEvent(ev);
      } catch (err) { /* events are a convenience, never a failure path */ }
    }

    function setState(next, force) {
      if (!force && state === next) return;
      state = next;
      var txt = STATE_TEXT[next] || next;
      for (var i = 0; i < els.state.length; i++) els.state[i].textContent = txt;
      if (root.dataset) root.dataset.cubePhase = next;
      emit('state', { state: next, text: txt, moves: displayMoves(), time: timerValue() });
    }

    function refreshState() {
      if (resetAnim) { setState('turning'); return; }
      if (sequence === 'scramble') { setState('scrambling'); return; }
      if (sequence === 'solve') { setState('solving'); return; }
      if (anim || queue.length) { setState('turning'); return; }
      setState(isSolved() ? 'solved' : 'scrambled');
    }

    /* -- 7. cube logic ---------------------------------------------------- */
    function isSolved() {
      for (var i = 0; i < cubies.length; i++) {
        var c = cubies[i], g = c.userData.g, h = c.userData.home;
        if (g[0] !== h[0] || g[1] !== h[1] || g[2] !== h[2]) return false;
        if (Math.abs(c.quaternion.w) < 0.99995) return false;
      }
      return true;
    }

    function startTurn(mv, now) {
      var f = FACES[mv.face];
      if (!f) return;
      var q = mv.turns === 2 ? 2 : (mv.turns === -1 ? -1 : 1);
      var k = f.dir * q;
      var angle = k * HALF_PI;

      var layer = [];
      for (var i = 0; i < cubies.length; i++) {
        if (cubies[i].userData.g[f.index] === f.layer) layer.push(cubies[i]);
      }
      if (!layer.length) return;

      pivot.rotation.set(0, 0, 0);
      for (i = 0; i < layer.length; i++) pivot.add(layer[i]);   /* local transform kept */

      anim = {
        face: mv.face,
        turns: q,
        axis: f.axis,
        index: f.index,
        k: k,
        angle: angle,
        t0: now,
        dur: reduced ? 0 : (mv.dur != null ? mv.dur : (q === 2 ? TURN_MS_DOUBLE : TURN_MS)),
        cubies: layer,
        manual: !!mv.manual,
        inverse: !!mv.inverse,
        q: new T.Quaternion().setFromAxisAngle(UNIT[f.axis], angle)
      };

      if (anim.dur <= 0) {
        pivot.rotation[f.axis] = angle;
        finishTurn();
      }
    }

    function finishTurn() {
      var a = anim;
      anim = null;
      if (!a) return;
      for (var i = 0; i < a.cubies.length; i++) {
        var c = a.cubies[i], g = c.userData.g;
        rotateGrid(g, a.index, a.k);
        c.quaternion.premultiply(a.q).normalize();
        c.position.set(g[0], g[1], g[2]);
        pivot.remove(c);
        cubeGroup.add(c);
      }
      a.cubies.length = 0;
      pivot.rotation.set(0, 0, 0);

      if (a.manual) history.push({ face: a.face, turns: a.turns });
      if (a.inverse) solveLeft = Math.max(0, solveLeft - 1);

      paintMoves();
      if (!queue.length) finishSequence(); else refreshState();
    }

    /* Bake whatever fraction of a turn is on screen, then drop the pivot. */
    function bakePartial() {
      var a = anim;
      if (!a) return;
      var cur = pivot.rotation[a.axis] || 0;
      var rot = new T.Quaternion().setFromAxisAngle(UNIT[a.axis], cur);
      for (var i = 0; i < a.cubies.length; i++) {
        var c = a.cubies[i];
        pivot.remove(c);
        c.quaternion.premultiply(rot).normalize();
        c.position.applyQuaternion(rot);
        cubeGroup.add(c);
      }
      a.cubies.length = 0;
      pivot.rotation.set(0, 0, 0);
    }

    function finishSequence() {
      if (sequence === 'scramble') {
        sequence = null;
        timerRunning = true;
        timerStart = nowMs();
        timerFinal = 0;
        lastPaint = 0;
        paintTime();
        refreshState();
        emit('scramble', { moves: history.length, state: state });
      } else if (sequence === 'solve') {
        sequence = null;
        solveLeft = 0;
        if (timerRunning) {
          timerRunning = false;
          timerFinal = Math.max(0, nowMs() - timerStart);
        }
        paintMoves();
        paintTime();
        refreshState();
        emit('solve', { time: timerFinal, state: state });
      }
    }

    function snapAll() {
      for (var i = 0; i < cubies.length; i++) {
        var c = cubies[i], h = c.userData.home;
        c.userData.g[0] = h[0];
        c.userData.g[1] = h[1];
        c.userData.g[2] = h[2];
        c.position.set(h[0], h[1], h[2]);
        c.quaternion.copy(IDENTITY);
      }
    }

    function stepTurn(now) {
      var a = anim;
      var p = a.dur > 0 ? (now - a.t0) / a.dur : 1;
      if (p > 1) p = 1;
      pivot.rotation[a.axis] = a.angle * (a.dur > 0 ? MECH(p) : 1);
      if (p >= 1) finishTurn();
    }

    function stepReset(now) {
      var r = resetAnim;
      var p = r.dur > 0 ? (now - r.t0) / r.dur : 1;
      if (p > 1) p = 1;
      var e = r.dur > 0 ? MECH(p) : 1;
      for (var i = 0; i < r.list.length; i++) {
        var it = r.list[i];
        it.c.position.lerpVectors(it.p0, it.home, e);
        it.c.quaternion.copy(it.q0).slerp(IDENTITY, e);
      }
      if (p >= 1) {
        snapAll();
        resetAnim = null;
        paintAll();
        refreshState();
      }
    }

    /* -- 8. public commands ----------------------------------------------- */
    function scramble() {
      if (disposed) return false;
      if (resetAnim) { snapAll(); resetAnim = null; }
      if (sequence || anim || queue.length) return false;

      history.length = 0;
      solveLeft = 0;
      timerRunning = false;
      timerFinal = 0;
      queue.length = 0;

      var count = 20 + Math.floor(Math.random() * 5);   /* 20–24 */
      var prevFace = '', prevAxis = '';
      scrambleMoves.length = 0;
      for (var i = 0; i < count; i++) {
        var face;
        do {
          face = FACE_ORDER[Math.floor(Math.random() * FACE_ORDER.length)];
        } while (face === prevFace || AXIS_OF[face] === prevAxis);
        var roll = Math.random();
        var turns = roll < 0.45 ? 1 : (roll < 0.85 ? -1 : 2);
        queue.push({ face: face, turns: turns, dur: turns === 2 ? SCRAMBLE_MS_DOUBLE : SCRAMBLE_MS });
        scrambleMoves.push({ face: face, turns: turns });
        prevFace = face;
        prevAxis = AXIS_OF[face];
      }

      sequence = 'scramble';
      paintAll();
      refreshState();
      dirty = true;
      if (!rafId) syncLoop();
      emit('scramble-start', { moves: count });
      return true;
    }

    function solve() {
      if (disposed) return false;
      if (resetAnim) { snapAll(); resetAnim = null; }
      if (sequence || anim || queue.length) return false;
      if (!history.length && !scrambleMoves.length) return false;

      var inverse = [];
      for (var i = history.length - 1; i >= 0; i--) {
        var h = history[i];
        inverse.push({ face: h.face, turns: h.turns === 2 ? 2 : -h.turns, inverse: true });
      }
      for (i = scrambleMoves.length - 1; i >= 0; i--) {
        var s = scrambleMoves[i];
        inverse.push({ face: s.face, turns: s.turns === 2 ? 2 : -s.turns, inverse: true });
      }
      history.length = 0;
      scrambleMoves.length = 0;
      solveLeft = inverse.length;
      queue.length = 0;
      for (i = 0; i < inverse.length; i++) queue.push(inverse[i]);

      sequence = 'solve';
      paintMoves();
      refreshState();
      dirty = true;
      if (!rafId) syncLoop();
      emit('solve-start', { moves: inverse.length });
      return true;
    }

    function reset() {
      if (disposed) return;
      if (anim) { bakePartial(); anim = null; }
      resetAnim = null;
      queue.length = 0;
      sequence = null;
      solveLeft = 0;
      history.length = 0;
      scrambleMoves.length = 0;
      timerRunning = false;
      timerFinal = 0;
      timerStart = 0;
      lastPaint = 0;
      dirty = true;
      if (reduced) { snapAll(); paintAll(); refreshState(); return; }

      var list = [];
      for (var i = 0; i < cubies.length; i++) {
        var c = cubies[i];
        list.push({
          c: c,
          p0: c.position.clone(),
          q0: c.quaternion.clone(),
          home: new T.Vector3(c.userData.home[0], c.userData.home[1], c.userData.home[2])
        });
      }
      resetAnim = { t0: nowMs(), dur: RESET_MS, list: list };
      paintAll();
      refreshState();
      if (!rafId) syncLoop();
    }

    function turn(face, turns) {
      if (disposed) return false;
      if (resetAnim) { snapAll(); resetAnim = null; }
      if (sequence) return false;                 /* never fight a replay */
      var key = String(face || '').toUpperCase();
      if (!FACES[key]) return false;
      var t = (turns === 2 || turns === -2) ? 2 : ((turns === -1 || turns === 3) ? -1 : 1);
      queue.push({ face: key, turns: t, manual: true });
      dirty = true;
      refreshState();
      if (!rafId) syncLoop();
      return true;
    }

    function syncSpinButton(on) {
      var btns = root.querySelectorAll('[data-cube-action="spin"]');
      for (var i = 0; i < btns.length; i++) {
        btns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
        if (btns[i].dataset) btns[i].dataset.active = on ? 'true' : 'false';
      }
    }

    function spin(force) {
      if (disposed) return false;
      spinEnabled = typeof force === 'boolean' ? force : !spinEnabled;
      lastInteraction = spinEnabled ? 0 : nowMs();
      syncSpinButton(spinEnabled);
      dirty = true;
      emit('spin', { on: spinEnabled });
      return spinEnabled;
    }

    /* -- 9. render loop --------------------------------------------------- */
    var requestFrame = global.requestAnimationFrame
      ? function (fn) { return global.requestAnimationFrame(fn); }
      : function (fn) { return global.setTimeout(function () { fn(nowMs()); }, 16); };
    var cancelFrame = global.cancelAnimationFrame
      ? function (id) { global.cancelAnimationFrame(id); }
      : function (id) { global.clearTimeout(id); };

    function renderFrame() {
      var cp = Math.cos(phi), sp = Math.sin(phi);
      camera.position.set(dist * cp * Math.sin(theta), dist * sp, dist * cp * Math.cos(theta));
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    }

    function update(dt, now) {
      var changed = false;

      if (resetAnim) {
        stepReset(now);
        changed = true;
      } else if (anim) {
        stepTurn(now);
        changed = true;
      } else if (queue.length) {
        do {
          startTurn(queue.shift(), now);
        } while (!anim && queue.length);
        changed = true;
      }

      if (!anim && !resetAnim && !queue.length && !dragging && spinEnabled) {
        if (now - lastInteraction > IDLE_MS) {
          theta += SPIN_SPEED * dt;
          changed = true;
        }
      }

      if (timerRunning && now - lastPaint >= 100) {
        lastPaint = now;
        paintTime();
      }
      return changed;
    }

    function tick(stamp) {
      if (disposed) return;
      rafId = requestFrame(tick);
      try {
        var now = typeof stamp === 'number' ? stamp : nowMs();
        var dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.1) : 0.016;
        lastFrame = now;
        var changed = update(dt, now);
        if (changed || dirty) {
          renderFrame();
          dirty = false;
        }
      } catch (err) {
        stopLoop();
        if (global.console && global.console.warn) {
          global.console.warn('[GoldenCube] render loop stopped:', err);
        }
      }
    }

    function startLoop() {
      if (disposed || rafId) return;
      if (!visible || doc.hidden) return;
      lastFrame = 0;
      rafId = requestFrame(tick);
    }

    function stopLoop() {
      if (!rafId) return;
      cancelFrame(rafId);
      rafId = 0;
    }

    function syncLoop() {
      if (disposed) { stopLoop(); return; }
      if (visible && !doc.hidden) startLoop(); else stopLoop();
    }

    /* -- 10. sizing ------------------------------------------------------- */
    function measure() {
      var w = Math.round(root.clientWidth || 0);
      var h = Math.round(root.clientHeight || 0);
      if (w > 0 && h < 24) {          /* bare container: keep the cube visible */
        h = Math.round(w * 0.72);
      }
      canvas.style.width = '100%';
      canvas.style.height = h + 'px';
      return { w: w, h: h };
    }

    function fitDistance(a) {
      var halfV = (CAM_FOV / 2) * PI / 180;
      var dv = CAM_RADIUS / Math.sin(halfV);
      var halfH = Math.atan(Math.tan(halfV) * a);
      var dh = CAM_RADIUS / Math.sin(halfH);
      return Math.max(dv, dh) * 1.2;
    }

    function applySize() {
      var m = measure();
      if (m.w < 2 || m.h < 2) return false;
      aspect = m.w / m.h;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      dist = fitDistance(aspect);
      try {
        renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, MAX_DPR));
        renderer.setSize(m.w, m.h, false);
      } catch (err) { return false; }
      dirty = true;
      return true;
    }

    /* -- 11. input -------------------------------------------------------- */
    function onDown(e) {
      if (disposed || !e) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = {
        id: e.pointerId,
        x: e.clientX, y: e.clientY,
        x0: e.clientX, y0: e.clientY,
        mode: e.pointerType === 'mouse' ? 'orbit' : 'wait'
      };
      lastInteraction = nowMs();
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
      root.classList.add('cube-dragging');
    }

    function onMove(e) {
      if (!dragging || !e || e.pointerId !== dragging.id) return;
      var dx = e.clientX - dragging.x;
      var dy = e.clientY - dragging.y;

      if (dragging.mode === 'wait') {
        var tx = e.clientX - dragging.x0;
        var ty = e.clientY - dragging.y0;
        if (Math.abs(tx) > 12 && Math.abs(tx) > Math.abs(ty)) {
          dragging.mode = 'orbit';
        } else if (Math.abs(ty) > 8) {
          dragging.mode = 'scroll';       /* vertical intent: hand it to the page */
          return;
        } else {
          return;
        }
      }
      if (dragging.mode !== 'orbit') return;

      theta -= dx * 0.0075;
      phi = clamp(phi + dy * 0.006, -0.25, 1.3);
      dragging.x = e.clientX;
      dragging.y = e.clientY;
      lastInteraction = nowMs();
      dirty = true;
    }

    function onUp(e) {
      if (!dragging) return;
      if (e && e.pointerId !== dragging.id) return;
      try { canvas.releasePointerCapture(dragging.id); } catch (err) { /* fine */ }
      dragging = null;
      lastInteraction = nowMs();
      root.classList.remove('cube-dragging');
    }

    function onClick(e) {
      if (disposed || !e || !e.target) return;
      var el = e.target.closest ? e.target.closest('[data-cube-action]') : null;
      if (!el || !root.contains(el)) return;
      var action = el.getAttribute('data-cube-action');
      if (action === 'scramble') { scramble(); }
      else if (action === 'solve') { solve(); }
      else if (action === 'reset') { reset(); }
      else if (action === 'spin') { spin(); }
      else { return; }
      if (e.preventDefault) e.preventDefault();
    }

    function onVisibilityChange() { syncLoop(); }

    function onMotionChange(e) {
      reduced = !!(e && e.matches);
      if (reduced) {
        spinEnabled = false;
        syncSpinButton(false);
      }
      dirty = true;
    }

    /* -- 12. observers / listeners --------------------------------------- */
    var ro = null, io = null;

    function onResize() { applySize(); }

    if (global.ResizeObserver) {
      ro = new global.ResizeObserver(function () { applySize(); });
      ro.observe(root);
    } else {
      global.addEventListener('resize', onResize);
    }

    if (global.IntersectionObserver) {
      io = new global.IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].target === root) visible = !!entries[i].isIntersecting;
        }
        syncLoop();
        if (visible) dirty = true;
      }, { threshold: 0 });
      io.observe(root);
    }

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('lostpointercapture', onUp);
    root.addEventListener('click', onClick);
    doc.addEventListener('visibilitychange', onVisibilityChange);
    if (mq) {
      if (mq.addEventListener) mq.addEventListener('change', onMotionChange);
      else if (mq.addListener) mq.addListener(onMotionChange);
    }

    /* -- 13. teardown ----------------------------------------------------- */
    function dispose() {
      if (disposed) return;
      disposed = true;
      stopLoop();

      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('lostpointercapture', onUp);
      root.removeEventListener('click', onClick);
      doc.removeEventListener('visibilitychange', onVisibilityChange);
      if (mq) {
        if (mq.removeEventListener) mq.removeEventListener('change', onMotionChange);
        else if (mq.removeListener) mq.removeListener(onMotionChange);
      }
      if (ro) { ro.disconnect(); ro = null; } else { global.removeEventListener('resize', onResize); }
      if (io) { io.disconnect(); io = null; }

      var geos = [], mats = [];
      cubeGroup.traverse(function (o) {
        if (o.geometry && geos.indexOf(o.geometry) === -1) geos.push(o.geometry);
        var m = o.material;
        if (!m) return;
        var list = Array.isArray(m) ? m : [m];
        for (var i = 0; i < list.length; i++) {
          if (mats.indexOf(list[i]) === -1) mats.push(list[i]);
        }
      });
      for (var i = 0; i < geos.length; i++) { try { geos[i].dispose(); } catch (e) {} }
      for (i = 0; i < mats.length; i++) { try { mats[i].dispose(); } catch (e) {} }
      scene.remove(cubeGroup);
      pivot = null;
      cubies.length = 0;
      queue.length = 0;
      history.length = 0;
      anim = null;
      resetAnim = null;

      try {
        renderer.dispose();
        if (ownCanvas && renderer.forceContextLoss) renderer.forceContextLoss();
      } catch (e) {}
      renderer = null;

      if (ownCanvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
      root.classList.remove('cube-ready', 'cube-dragging', 'no-webgl');
      if (root.dataset && 'cubePhase' in root.dataset) { try { delete root.dataset.cubePhase; } catch (e) {} }
      if (root.__goldenCube === api) { try { delete root.__goldenCube; } catch (e) {} }
    }

    /* -- 14. boot --------------------------------------------------------- */
    var api = {
      scramble: scramble,
      solve: solve,
      reset: reset,
      turn: turn,
      spin: spin,
      isSolved: isSolved,
      state: function () { return state; },
      dispose: dispose
    };

    applySize();
    syncSpinButton(spinEnabled);
    setState('solved', true);
    paintAll();
    syncLoop();
    renderFrame();
    dirty = false;

    root.classList.remove('no-webgl');
    root.classList.add('cube-ready');
    root.__goldenCube = api;

    return api;
  }

  /* -- failure path: no THREE, no WebGL, no context. Never throws. --------- */
  function fail(root, reason) {
    if (reason && global.console && global.console.warn && reason !== 'no-webgl') {
      global.console.warn('[GoldenCube] unavailable:', reason);
    }
    if (root) {
      try {
        root.classList.add('no-webgl');
        root.classList.remove('cube-ready');
        if (root.dataset) root.dataset.cubePhase = 'unavailable';
        var set = function (sel, txt) {
          var list = root.querySelectorAll(sel);
          for (var i = 0; i < list.length; i++) list[i].textContent = txt;
        };
        set('[data-cube-time]', '00.00');
        set('[data-cube-moves]', '00');
        set('[data-cube-state]', STATE_TEXT.unavailable);
      } catch (err) { /* nothing else to do */ }
    }
    return stub(root);
  }

  function stub(root) {
    var api = {
      scramble: function () { return false; },
      solve: function () { return false; },
      reset: function () { return undefined; },
      turn: function () { return false; },
      spin: function () { return false; },
      isSolved: function () { return false; },
      state: function () { return 'unavailable'; },
      dispose: function () {
        if (root && root.classList) root.classList.remove('no-webgl');
        if (root && root.__goldenCube === api) {
          try { delete root.__goldenCube; } catch (e) { /* noop */ }
        }
      }
    };
    if (root) {
      try {
        if (root.classList) root.classList.add('no-webgl');
        if (root.dataset) root.dataset.cubePhase = 'unavailable';
        root.__goldenCube = api;
      } catch (err) { /* noop */ }
    }
    return api;
  }

  function mount(root, opts) {
    if (typeof root === 'string') {
      try { root = document.querySelector(root); } catch (err) { root = null; }
    }
    if (!root || !root.nodeType) { return stub(null); }
    var prev = root.__goldenCube;
    if (prev && typeof prev.dispose === 'function') {
      try { prev.dispose(); } catch (err) { /* noop */ }
    }
    try {
      return create(root, opts || {});
    } catch (err) {
      return fail(root, err);
    }
  }

  global.GoldenCube = { version: '1.0.0', mount: mount };
})(window);
