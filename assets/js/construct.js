/* CONSTRUCT — one 3D layer for the whole page.
   A cloud of small cubes that assembles into a different object for each
   chapter. three.js r149 UMD, no dependencies. Classic script. */
(function () {
  'use strict';
  var THREE = window.THREE;
  if (!THREE) { window.GoldenConstruct = noop(); return; }

  var N = 180;
  var BUILD_MS = 1100;
  /* x, y, scale, opacity per chapter — keeps the layer out of dense content */
  var ANCHORS = [
    { x: 2.2, y: -0.1, s: 0.80, op: 0.34 },
    { x: 2.4, y: 0.0, s: 0.76, op: 0.05 },
    { x: 2.2, y: 0.0, s: 0.80, op: 0.05 },
    { x: 2.7, y: 0.45, s: 0.68, op: 0.14 },
    { x: 2.1, y: 0.0, s: 0.84, op: 0.36 },
    { x: 2.3, y: 0.0, s: 0.78, op: 0.28 },
    { x: 2.1, y: 0.0, s: 0.84, op: 0.05 },
    { x: -2.3, y: 0.0, s: 0.78, op: 0.22 },
    { x: 2.1, y: 0.0, s: 0.84, op: 0.30 }
  ];
  var anchor = { x: 1.6, y: -0.05, s: 1.0, op: 0.3 };
  var S = {
    mounted: false, paused: true, ready: false,
    renderer: null, scene: null, camera: null, canvas: null,
    mainMesh: null, accentMesh: null, group: null, dummy: null,
    theme: 'dark', section: -1, t0: 0, raf: 0, last: 0,
    data: [], current: [], start: [], targets: [],
    pointerX: 0, pointerY: 0, px: 0, py: 0,
    reduce: false, w: 0, h: 0, baseOp: 0.3
  };

  var C = {
    dark: { ink: 0xEDEDED, accent: 0xFFFA00, inkOp: 0.42, accentOp: 0.95 },
    light: { ink: 0x161616, accent: 0xFFFA00, inkOp: 0.18, accentOp: 0.8 }
  };

  /* ---------- formations (normalized coordinates) ---------- */
  function V(x, y, z) { return new THREE.Vector3(x, y, z); }
  function pushLine(out, a, b, n) {
    for (var i = 0; i <= n; i++) {
      out.push(new THREE.Vector3().lerpVectors(a, b, i / n));
    }
  }
  function pushRing(out, r, n, cx, cy, cz, sy) {
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2;
      out.push(V(cx + Math.cos(a) * r, cy + Math.sin(a) * r * (sy || 1), cz || 0));
    }
  }
  function pushRect(out, w, h, cx, cy, cz, n) {
    var hw = w / 2, hh = h / 2;
    pushLine(out, V(cx - hw, cy - hh, cz), V(cx + hw, cy - hh, cz), n);
    pushLine(out, V(cx + hw, cy - hh, cz), V(cx + hw, cy + hh, cz), n);
    pushLine(out, V(cx + hw, cy + hh, cz), V(cx - hw, cy + hh, cz), n);
    pushLine(out, V(cx - hw, cy + hh, cz), V(cx - hw, cy - hh, cz), n);
  }

  var FORMATIONS = [
    /* 0 about — a profile: head ring, shoulder arcs, spine */
    function () {
      var o = [];
      pushRing(o, 0.85, 30, 0, 0.42, 0, 1.05);
      pushRing(o, 0.55, 21, 0, 0.42, 0.18, 1.0);
      pushLine(o, V(0, -0.5, 0), V(0, -1.4, 0), 8);
      pushRing(o, 1.25, 22, 0, -1.15, 0, 0.38);
      for (var i = 0; i < 26; i++) {
        var a = (i / 26) * Math.PI * 2;
        o.push(V(Math.cos(a) * 0.55, 0.42 + Math.sin(a) * 0.72, (Math.random() - 0.5) * 0.5));
      }
      return o;
    },
    /* 1 skills — four bars of different heights */
    function () {
      var o = [], hs = [0.7, 1.25, 0.95, 1.5], xs = [-1.5, -0.5, 0.5, 1.5];
      for (var i = 0; i < xs.length; i++) {
        pushLine(o, V(xs[i], -1.2, 0), V(xs[i], -1.2 + hs[i], 0), 14);
        pushLine(o, V(xs[i], -1.2 + hs[i], 0), V(xs[i], -1.05 + hs[i], 0.35), 3);
      }
      return o;
    },
    /* 2 works — four floating frames */
    function () {
      var o = [], xs = [-1.65, -0.55, 0.55, 1.65], zs = [0.6, -0.3, 0.4, -0.6];
      for (var i = 0; i < xs.length; i++) pushRect(o, 0.85, 1.15, xs[i], 0.1, zs[i], 7);
      return o;
    },
    /* 3 model — stacked transformer plates */
    function () {
      var o = [], L = 9, g = 4;
      for (var l = 0; l < L; l++) {
        var y = -1.35 + (l / (L - 1)) * 2.7;
        var s = 0.62 + l * 0.05;
        for (var ix = 0; ix < g; ix++) {
          for (var iz = 0; iz < g; iz++) {
            o.push(V((ix / (g - 1) - 0.5) * 2 * s, y, (iz / (g - 1) - 0.5) * 2 * s));
          }
        }
      }
      return o;
    },
    /* 4 arena — a gate */
    function () {
      var o = [];
      pushLine(o, V(-1.15, -1.35, 0), V(-1.15, 0.85, 0), 14);
      pushLine(o, V(1.15, -1.35, 0), V(1.15, 0.85, 0), 14);
      pushRing(o, 1.15, 24, 0, 0.85, 0, 0.6);
      pushLine(o, V(-1.35, -1.35, 0.45), V(1.35, -1.35, 0.45), 10);
      pushLine(o, V(-1.35, -1.35, -0.45), V(1.35, -1.35, -0.45), 10);
      return o;
    },
    /* 5 cube — 3x3x3 lattice */
    function () {
      var o = [];
      for (var x = -1; x <= 1; x++) {
        for (var y = -1; y <= 1; y++) {
          for (var z = -1; z <= 1; z++) {
            o.push(V(x * 0.62, y * 0.62 + 0.1, z * 0.62));
          }
        }
      }
      return o;
    },
    /* 6 fab — printer gantry and rising layers */
    function () {
      var o = [];
      pushRect(o, 2.3, 2.1, 0, 0.1, 0, 12);
      pushLine(o, V(-1.15, 1.25, -1.05), V(-1.15, 1.25, 1.05), 8);
      pushLine(o, V(1.15, 1.25, -1.05), V(1.15, 1.25, 1.05), 8);
      pushLine(o, V(0, 1.25, 0), V(0, 0.45, 0), 7);
      for (var l = 0; l < 8; l++) {
        pushLine(o, V(-0.6, -0.95 + l * 0.16, -0.4), V(0.6, -0.95 + l * 0.16, -0.4), 8);
        pushLine(o, V(-0.6, -0.95 + l * 0.16, 0.4), V(0.6, -0.95 + l * 0.16, 0.4), 8);
      }
      pushLine(o, V(-1.15, -1.2, 0), V(1.15, -1.2, 0), 10);
      return o;
    },
    /* 7 life — camera body, lens, viewfinder */
    function () {
      var o = [];
      pushRect(o, 2.0, 1.35, 0, 0.05, 0, 12);
      pushRing(o, 0.52, 22, 0, 0.02, 0.1, 1);
      pushRing(o, 0.34, 16, 0, 0.02, 0.1, 1);
      pushLine(o, V(-0.55, 0.75, 0), V(-0.35, 1.1, 0), 4);
      pushLine(o, V(0.55, 0.75, 0), V(0.35, 1.1, 0), 4);
      pushLine(o, V(-0.35, 1.1, 0), V(0.35, 1.1, 0), 5);
      for (var i = 0; i < 16; i++) {
        var a = (i / 16) * Math.PI * 2;
        o.push(V(Math.cos(a) * 0.72, Math.sin(a) * 0.72, 0.1));
      }
      return o;
    },
    /* 8 contact — portal rings */
    function () {
      var o = [];
      pushRing(o, 0.55, 16, 0, 0, 0, 1);
      pushRing(o, 1.0, 24, 0, 0, 0, 1);
      pushRing(o, 1.45, 32, 0, 0, 0, 1);
      pushLine(o, V(0, -1.6, 0), V(0, 1.6, 0), 12);
      for (var i = 0; i < 18; i++) {
        var a = (i / 18) * Math.PI * 2;
        var r = 1.75;
        o.push(V(Math.cos(a) * r, Math.sin(a) * r * 0.9, (Math.random() - 0.5) * 0.8));
      }
      return o;
    }
  ];

  function makeFormation(index) {
    var pts = FORMATIONS[index] ? FORMATIONS[index]() : FORMATIONS[0]();
    if (!pts.length) pts = [V(0, 0, 0)];
    var out = [];
    for (var i = 0; i < N; i++) {
      var base = pts[i % pts.length];
      var jitter = i < pts.length ? 0.012 : 0.045;
      out.push(new THREE.Vector3(
        base.x + (Math.random() - 0.5) * jitter,
        base.y + (Math.random() - 0.5) * jitter,
        base.z + (Math.random() - 0.5) * jitter
      ));
    }
    return out;
  }

  /* ---------- setup ---------- */
  function mount() {
    if (S.mounted) return;
    if (!window.__hasWebGL) return;
    var canvas = document.getElementById('construct-canvas');
    if (!canvas) return;
    S.canvas = canvas;
    try {
      S.renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    } catch (e) { return; }
    S.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 900 ? 1.25 : 1.7));
    S.reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    S.scene = new THREE.Scene();
    S.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    S.camera.position.set(0, 0.1, 9);
    S.group = new THREE.Group();
    S.scene.add(S.group);
    S.group.position.set(1.5, -0.05, 0);
    S.dummy = new THREE.Object3D();

    var geo = new THREE.BoxGeometry(0.075, 0.075, 0.075);
    var matMain = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false });
    var matAccent = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false });
    S.mainMesh = new THREE.InstancedMesh(geo, matMain, N);
    S.accentMesh = new THREE.InstancedMesh(geo.clone(), matAccent, N);
    S.mainMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    S.accentMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    S.mainMesh.frustumCulled = false;
    S.accentMesh.frustumCulled = false;
    S.group.add(S.mainMesh);
    S.group.add(S.accentMesh);

    for (var i = 0; i < N; i++) {
      S.data.push({
        accent: i % 11 === 0,
        delay: 0,
        scale: 0.6 + Math.random() * 0.7
      });
      S.current.push(new THREE.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6));
      S.start.push(new THREE.Vector3());
      S.targets.push(new THREE.Vector3());
    }
    applyTheme();
    resize();
    S.mounted = true;
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointermove', function (e) {
      S.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      S.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
    S.last = performance.now();
    S.raf = requestAnimationFrame(loop);
    if (S.section >= 0) setSection(S.section);
  }

  function resize() {
    if (!S.renderer) return;
    S.w = window.innerWidth;
    S.h = window.innerHeight;
    S.renderer.setSize(S.w, S.h, false);
    S.camera.aspect = S.w / S.h;
    S.camera.updateProjectionMatrix();
    var k = S.w < 1200 ? 0.62 : (S.w < 1440 ? 0.9 : 1);
    S.group.position.x = anchor.x * k;
    S.group.scale.setScalar(anchor.s * (S.w < 1200 ? 0.8 : 1));
  }

  function applyTheme() {
    if (!S.mounted) return;
    var c = C[S.theme] || C.dark;
    S.mainMesh.material.color.setHex(c.ink);
    S.mainMesh.material.opacity = S.baseOp * (S.theme === 'light' ? 0.52 : 1);
    S.accentMesh.material.color.setHex(c.accent);
    S.accentMesh.material.opacity = Math.min(1, S.baseOp * 2.6);
    S.accentMesh.visible = true;
  }

  function setSection(index) {
    if (!S.mounted) { S.section = index; return; }
    S.section = index;
    var a = ANCHORS[index] || ANCHORS[0];
    anchor = a;
    S.baseOp = a.op;
    applyTheme();
    var k = S.w < 1200 ? 0.62 : (S.w < 1440 ? 0.9 : 1);
    S.group.scale.setScalar(a.s * (S.w < 1200 ? 0.8 : 1));
    var targets = makeFormation(index);
    for (var i = 0; i < N; i++) {
      S.start[i].copy(S.current[i]);
      S.targets[i].copy(targets[i]);
      S.data[i].delay = (i / N) * 0.42 + Math.random() * 0.14;
    }
    S.t0 = performance.now();
    if (S.reduce) {
      for (var k = 0; k < N; k++) S.current[k].copy(S.targets[k]);
      S.t0 = -1e9;
      writeMatrices();
    }
    if (S.canvas) S.canvas.classList.add('is-on');
  }

  function easeMech(p) {
    /* cubic-bezier(.7,0,.2,1) approximated with a smooth hard stop */
    return p < 1 ? 1 - Math.pow(1 - p, 2.2) : 1;
  }

  var ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  function writeMatrices() {
    var p = S.section >= 0 && !S.reduce ? (performance.now() - S.t0) / BUILD_MS : 2;
    for (var i = 0; i < N; i++) {
      var d = S.data[i];
      S.dummy.position.copy(S.current[i]);
      var sc = d.scale;
      if (p < 1.25) {
        var q = Math.max(0, Math.min(1, (p - d.delay) / (1 - d.delay + 0.001)));
        sc *= 0.35 + 0.65 * easeMech(q);
      }
      S.dummy.scale.setScalar(sc);
      S.dummy.rotation.set(0, 0, 0);
      S.dummy.updateMatrix();
      if (d.accent) {
        S.accentMesh.setMatrixAt(i, S.dummy.matrix);
        S.mainMesh.setMatrixAt(i, ZERO);
      } else {
        S.mainMesh.setMatrixAt(i, S.dummy.matrix);
        S.accentMesh.setMatrixAt(i, ZERO);
      }
    }
    S.mainMesh.instanceMatrix.needsUpdate = true;
    S.accentMesh.instanceMatrix.needsUpdate = true;
  }

  function updateBuild(now) {
    if (S.section < 0) return false;
    var p = (now - S.t0) / BUILD_MS;
    if (p > 1.25) return false;
    for (var i = 0; i < N; i++) {
      var d = S.data[i];
      var q = Math.max(0, Math.min(1, (p - d.delay) / (1 - d.delay + 0.001)));
      S.current[i].lerpVectors(S.start[i], S.targets[i], easeMech(q));
    }
    return true;
  }

  function loop(now) {
    S.raf = requestAnimationFrame(loop);
    if (S.paused) return;
    var t = now / 1000;
    var changed = updateBuild(now);
    if (changed) writeMatrices();
    S.px += (S.pointerX - S.px) * 0.05;
    S.py += (S.pointerY - S.py) * 0.05;
    var k = S.w < 1200 ? 0.62 : (S.w < 1440 ? 0.9 : 1);
    S.group.position.x += (anchor.x * k - S.group.position.x) * 0.06;
    S.group.position.y += (anchor.y + Math.sin(t * 0.45) * 0.05 - S.group.position.y) * 0.06;
    S.mainMesh.material.opacity += (S.baseOp * (S.theme === 'light' ? 0.52 : 1) - S.mainMesh.material.opacity) * 0.06;
    S.accentMesh.material.opacity += (Math.min(1, S.baseOp * 2.6) - S.accentMesh.material.opacity) * 0.06;
    if (!S.reduce) {
      S.group.rotation.y = Math.sin(t * 0.16) * 0.18 + S.px * 0.22;
      S.group.rotation.x = S.py * 0.1;
    }
    S.renderer.render(S.scene, S.camera);
  }

  function pause() { S.paused = true; if (S.canvas) S.canvas.classList.remove('is-on'); }
  function resume() { if (!S.mounted) return; S.paused = false; if (S.canvas) S.canvas.classList.add('is-on'); }
  function setTheme(theme) { S.theme = theme === 'light' ? 'light' : 'dark'; applyTheme(); }
  function dispose() {
    cancelAnimationFrame(S.raf);
    S.paused = true;
    window.removeEventListener('resize', resize);
    if (S.scene) {
      S.scene.traverse(function (o) {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
    }
    if (S.renderer) { S.renderer.dispose(); if (S.renderer.forceContextLoss) S.renderer.forceContextLoss(); }
    S.renderer = null; S.mounted = false;
  }

  function noop() {
    return { mount: function () {}, setSection: function () {}, setTheme: function () {}, pause: function () {}, resume: function () {}, dispose: function () {}, isMounted: function () { return false; } };
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) S.paused = true;
    else if (S.mounted && S.section >= 0) S.paused = false;
  });

  window.GoldenConstruct = {
    mount: mount,
    setSection: setSection,
    setTheme: setTheme,
    pause: pause,
    resume: resume,
    dispose: dispose,
    isMounted: function () { return S.mounted; }
  };
})();
