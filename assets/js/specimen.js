/* SPECIMEN — 3D viewers for the skill list (02) and project blueprint (03).
   Ported in spirit from the boke3 SkillScene: a big stage, metal slabs,
   yellow signal lines, pointer parallax and a hard scale/rotate cut on switch.
   three.js r149 UMD, classic script. */
(function () {
  'use strict';
  var THREE = window.THREE;
  if (!THREE) { window.GoldenSpecimen = { mount: function () { return null; } }; return; }

  var COL = {
    dark: { ink: 0xEDEDED, dim: 0x7C7C7C, plate: 0x2C2C2C, steel: 0x3B3B3B, accent: 0xFFFA00 },
    light: { ink: 0x161616, dim: 0x777777, plate: 0xCFCFC9, steel: 0xBFBFB9, accent: 0xFFFA00 }
  };

  function lineMat(color, opacity) {
    return new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: opacity == null ? 0.85 : opacity });
  }
  function solidMat(color, opacity) {
    return new THREE.MeshStandardMaterial({
      color: color, metalness: 0.55, roughness: 0.38,
      transparent: opacity != null, opacity: opacity == null ? 1 : opacity
    });
  }
  function glowMat(color, opacity) {
    return new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: opacity == null ? 1 : opacity });
  }
  function edgesOf(geo, mat) {
    return new THREE.LineSegments(new THREE.EdgesGeometry(geo), mat);
  }
  function ringPts(r, seg) {
    var pts = [];
    for (var i = 0; i <= seg; i++) {
      var a = (i / seg) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
    }
    return pts;
  }

  /* ---------------------------------------------------------------- */
  function buildVariant(kind, i, c) {
    var g = new THREE.Group();
    var ink = c.ink, dim = c.dim, plate = c.plate, steel = c.steel, accent = c.accent;
    var lineInk = lineMat(ink, 0.7);
    var lineDim = lineMat(dim, 0.45);
    var lineAcc = lineMat(accent, 0.95);
    var solid = solidMat(steel);
    var solidDark = solidMat(plate);
    var glass = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.12, depthWrite: false });
    var accWire = new THREE.MeshBasicMaterial({ color: accent, wireframe: true, transparent: true, opacity: 0.95 });
    var inkWire = new THREE.MeshBasicMaterial({ color: ink, wireframe: true, transparent: true, opacity: 0.42 });
    var accGlow = glowMat(accent, 0.95);
    var nodeGeo = new THREE.SphereGeometry(0.055, 12, 12);
    var cubeGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    var ticks = [];

    function add(o) { g.add(o); return o; }
    function tick(fn) { ticks.push(fn); }

    if (kind === 'skills') {
      if (i === 0) {
        /* Linux: kernel rings around a protected core */
        for (var l = 0; l < 6; l++) {
          var ringGeo = new THREE.TorusGeometry(1.62 - l * 0.2, l === 2 ? 0.022 : 0.009, 4, 96);
          var ring = add(new THREE.Mesh(ringGeo, l === 2 ? lineAcc : lineInk));
          ring.rotation.x = Math.PI / 2;
          ring.position.y = (l - 2.5) * 0.3;
          ring.rotation.z = l * 0.14;
        }
        var kernel = add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2.5, 12, 4, true), inkWire));
        var core = add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 2.15, 10, 3, true), accWire));
        kernel.position.y = 0; core.position.y = 0;
        for (var d = 0; d < 10; d++) {
          var ang = (d / 10) * Math.PI * 2;
          var dot = add(new THREE.Mesh(cubeGeo, d % 4 === 0 ? accGlow : solid));
          dot.position.set(Math.cos(ang) * 1.28, (d % 3 - 1) * 0.72, Math.sin(ang) * 1.28);
        }
        tick(function (t) {
          g.rotation.y = t * 0.22;
          core.scale.setScalar(1 + Math.sin(t * 1.4) * 0.02);
        });
      } else if (i === 1) {
        /* C++: layered structural slabs with a hot middle plate */
        for (var s = 0; s < 5; s++) {
          var size = 2.15 - Math.abs(s - 2) * 0.16;
          var slabGeo = new THREE.BoxGeometry(size, 0.12, 1.35);
          var slab = add(edgesOf(slabGeo, s === 2 ? lineAcc : lineInk));
          slab.position.y = (s - 2) * 0.44;
          slab.rotation.y = s % 2 === 0 ? 0.3 : -0.3;
          if (s === 2) {
            var fill = add(new THREE.Mesh(slabGeo, glass));
            fill.position.copy(slab.position);
            fill.rotation.copy(slab.rotation);
          }
          if (s < 4) {
            add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(-size / 2 + 0.18, slab.position.y, 0),
              new THREE.Vector3(-size / 2 + 0.18, slab.position.y + 0.44, 0)
            ]), s === 1 ? lineAcc : lineDim));
          }
        }
        tick(function (t) { g.rotation.y = -0.35 + Math.sin(t * 0.35) * 0.22; g.rotation.x = 0.04; });
      } else if (i === 2) {
        /* AI: dense layer stack */
        var layers = [];
        for (var L = 0; L < 4; L++) {
          var layer = [];
          for (var n = 0; n < 7; n++) {
            var a = (n / 7) * Math.PI * 2;
            var p = new THREE.Vector3((L - 1.5) * 0.92, Math.cos(a) * 0.78, Math.sin(a) * 0.78);
            layer.push(p);
            var node = add(new THREE.Mesh(nodeGeo, L === 1 && n % 2 === 0 ? accGlow : (L % 2 ? solid : solidDark)));
            node.position.copy(p);
            if (L === 1 && n % 2 === 0) node.scale.setScalar(1.7);
          }
          layers.push(layer);
        }
        var connPts = [];
        for (var li = 0; li < layers.length - 1; li++) {
          layers[li].forEach(function (from) {
            layers[li + 1].forEach(function (to) { connPts.push(from, to); });
          });
        }
        add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(connPts), lineDim));
        var halo = add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPts(1.35, 48)), lineAcc));
        halo.position.set(0, 0, -1.1);
        tick(function (t) {
          g.rotation.y = t * 0.25;
          halo.rotation.z = -t * 0.4;
        });
      } else {
        /* Making: a small printer growing an object */
        add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.2, 2.0, 2.0)), lineInk));
        var bed = add(new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.05, 1.7), solidDark)); bed.position.y = -0.94;
        var gantry = add(new THREE.Group());
        var bar = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.05, 0.05), solid); gantry.add(bar);
        var head = new THREE.Group();
        head.add(new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.24, 4), solid));
        head.add(edgesOf(new THREE.ConeGeometry(0.1, 0.24, 4), lineAcc));
        var beam = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -1.2, 0)]), lineAcc);
        head.add(beam); gantry.add(head); gantry.position.y = 0.2;
        var stack = new THREE.Group(); add(stack);
        var printed = [];
        for (var L2 = 0; L2 < 10; L2++) {
          var pl = new THREE.Mesh(new THREE.BoxGeometry(0.85 - L2 * 0.03, 0.06, 0.85 - L2 * 0.03), L2 === 9 ? accGlow : solid);
          pl.position.y = -0.9 + L2 * 0.1; pl.visible = false; stack.add(pl); printed.push(pl);
        }
        tick(function (t) {
          var cycle = (t * 0.25) % 1;
          var shown = Math.floor(cycle * 12);
          printed.forEach(function (p, k) { p.visible = k < shown; });
          var hx = Math.sin(t * 1.4) * 0.5;
          var hz = Math.cos(t * 1.1) * 0.5;
          gantry.position.y = 0.9 - cycle * 1.75;
          head.position.set(hx, 0, hz);
          beam.scale.y = 0.3 + Math.sin(t * 2) * 0.05;
          g.rotation.y = 0.3 + Math.sin(t * 0.25) * 0.28;
        });
      }
    } else if (kind === 'works') {
      if (i === 0) {
        /* Aurora: an iso rack of five blades on four posts */
        for (var r = 0; r < 5; r++) {
          var bGeo = new THREE.BoxGeometry(1.85, 0.08, 1.3);
          var blade = add(edgesOf(bGeo, r === 2 ? lineAcc : lineInk));
          blade.position.set(0, (r - 2) * 0.36, 0);
          blade.rotation.y = 0.32;
          if (r === 2) {
            var bf = add(new THREE.Mesh(bGeo, glass)); bf.position.copy(blade.position); bf.rotation.copy(blade.rotation);
          }
        }
        [[-0.78, -0.62], [0.78, -0.62], [-0.78, 0.62], [0.78, 0.62]].forEach(function (p) {
          var post = add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.0, 0.07), solid));
          post.position.set(p[0], 0, p[1] * 0.7);
        });
        var aBar = add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.8), accGlow));
        aBar.position.y = 0.94;
        tick(function (t) { g.rotation.y = -0.5 + Math.sin(t * 0.3) * 0.35; aBar.material.opacity = 0.5 + Math.sin(t * 2) * 0.4; });
      } else if (i === 1) {
        /* Lumen: a 3D collaboration graph with travelling signals */
        var nodes = [], pulses = [], edges = [];
        for (var n2 = 0; n2 < 8; n2++) {
          var ang2 = (n2 / 8) * Math.PI * 2;
          var rad = n2 === 0 ? 0 : 1.15;
          nodes.push(new THREE.Vector3(Math.cos(ang2) * rad, Math.sin(ang2) * rad * 0.7, (n2 % 3 - 1) * 0.42));
        }
        for (var e = 1; e < nodes.length; e++) {
          edges.push([nodes[0], nodes[e]]);
          edges.push([nodes[e], nodes[(e % (nodes.length - 1)) + 1]]);
        }
        edges.forEach(function (pair) {
          add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pair), lineDim));
        });
        nodes.forEach(function (p, k) {
          var nd = add(new THREE.Mesh(new THREE.SphereGeometry(k === 0 ? 0.11 : 0.06, 12, 12), k === 0 ? accGlow : solid));
          nd.position.copy(p);
        });
        for (var pi = 0; pi < 4; pi++) {
          var pulse = add(new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), accGlow));
          pulses.push({ mesh: pulse, edge: edges[(pi * 5) % edges.length] });
        }
        tick(function (t) {
          g.rotation.y = t * 0.28;
          g.rotation.x = 0.2;
          pulses.forEach(function (p, k) {
            var u = ((t * 0.5 + k * 0.25) % 1);
            p.mesh.position.lerpVectors(p.edge[0], p.edge[1], u);
          });
        });
      } else if (i === 2) {
        /* Solaris: a monitoring bench with a live waveform */
        var monitor = add(edgesOf(new THREE.BoxGeometry(2.4, 1.4, 0.12), lineInk));
        monitor.position.y = 0.25;
        var screen = add(new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.2), new THREE.MeshBasicMaterial({ color: plate, transparent: true, opacity: 0.35 })));
        screen.position.set(0, 0.25, -0.07);
        var gridPts = [];
        for (var gx = -1; gx <= 1.0001; gx += 0.25) gridPts.push(new THREE.Vector3(gx, -0.35, 0), new THREE.Vector3(gx, 0.85, 0));
        add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(gridPts), lineDim));
        var wavePts = [];
        for (var w = 0; w <= 40; w++) wavePts.push(new THREE.Vector3(-1.05 + (w / 40) * 2.1, 0.25 + Math.sin(w * 0.5) * 0.22, 0.02));
        var wave = add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(wavePts), lineAcc));
        add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -0.45, 0.25), new THREE.Vector3(0, -0.85, 0.25)]), lineInk));
        add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.7, -0.9, 0.15), new THREE.Vector3(0.7, -0.9, 0.15)]), lineInk));
        tick(function (t) {
          var pos = wave.geometry.attributes.position;
          for (var k2 = 0; k2 < pos.count; k2++) pos.setY(k2, 0.25 + Math.sin(k2 * 0.5 + t * 2.4) * 0.22);
          pos.needsUpdate = true;
          g.rotation.y = Math.sin(t * 0.22) * 0.18;
        });
      } else {
        /* 1B model: a transformer stack with token beads */
        for (var pl2 = 0; pl2 < 7; pl2++) {
          var plateGeo = new THREE.BoxGeometry(1.7, 0.05, 1.15);
          var pmesh = add(edgesOf(plateGeo, pl2 === 3 ? lineAcc : lineInk));
          pmesh.position.y = (pl2 - 3) * 0.3;
          pmesh.rotation.y = pl2 % 2 ? 0.05 : -0.05;
          if (pl2 === 3) {
            var pf = add(new THREE.Mesh(plateGeo, glass)); pf.position.copy(pmesh.position);
          }
          for (var tb = 0; tb < 6; tb++) {
            var bead = add(new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), tb === 0 ? accGlow : (pl2 % 2 ? solid : solidDark)));
            bead.position.set(-0.65 + tb * 0.26, (pl2 - 3) * 0.3 + 0.05, 0.5);
          }
        }
        var beamL = add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -1.15, 0), new THREE.Vector3(0, 1.15, 0)]), lineAcc));
        tick(function (t) {
          g.rotation.y = t * 0.24;
          g.rotation.x = 0.08;
          beamL.material.opacity = 0.35 + Math.sin(t * 2.2) * 0.3;
        });
      }
    } else if (kind === 'fab') {
      /* small printer used by the fab block before the city cinema */
      add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.2, 2.0, 2.0)), lineInk));
      var bed2 = add(new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.05, 1.7), solidDark)); bed2.position.y = -0.94;
      var gantry2 = add(new THREE.Group());
      var bar2 = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.05, 0.05), solid); gantry2.add(bar2);
      var head2 = new THREE.Group();
      head2.add(new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.24, 4), solid));
      head2.add(edgesOf(new THREE.ConeGeometry(0.1, 0.24, 4), lineAcc));
      var beam2 = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -1.2, 0)]), lineAcc);
      head2.add(beam2); gantry2.add(head2); gantry2.position.y = 0.2;
      var stack2 = new THREE.Group(); add(stack2);
      var printed2 = [];
      for (var q = 0; q < 10; q++) {
        var pl3 = new THREE.Mesh(new THREE.BoxGeometry(0.85 - q * 0.03, 0.06, 0.85 - q * 0.03), q === 9 ? accGlow : solid);
        pl3.position.y = -0.9 + q * 0.1; pl3.visible = false; stack2.add(pl3); printed2.push(pl3);
      }
      tick(function (t) {
        var cycle2 = (t * 0.25) % 1;
        var shown2 = Math.floor(cycle2 * 12);
        printed2.forEach(function (p, k) { p.visible = k < shown2; });
        gantry2.position.y = 0.9 - cycle2 * 1.75;
        head2.position.set(Math.sin(t * 1.4) * 0.5, 0, Math.cos(t * 1.1) * 0.5);
        g.rotation.y = 0.3 + Math.sin(t * 0.25) * 0.28;
      });
    }

    return {
      group: g,
      tick: function (t, dt) { for (var k = 0; k < ticks.length; k++) ticks[k](t, dt); },
      dispose: function () {
        g.traverse(function (o) {
          if (o.geometry) o.geometry.dispose();
          if (o.material) {
            var list = Array.isArray(o.material) ? o.material : [o.material];
            list.forEach(function (m) { m.dispose(); });
          }
        });
      }
    };
  }

  /* ---------------------------------------------------------------- */
  function mount(canvas, kind, opts) {
    if (!THREE || !window.__hasWebGL || !canvas) return null;
    var theme = (opts && opts.theme) || (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    } catch (e) { return null; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 900 ? 1.3 : 1.7));
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
    var camZ = kind === 'fab' ? 4.4 : (kind === 'skills' || kind === 'works' ? 4.3 : 3.2);
    if (window.innerWidth < 900) camZ *= 1.18;
    camera.position.set(0, 0.1, camZ);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x242424, 1.1));
    var key = new THREE.DirectionalLight(0xffffff, 1.35);
    key.position.set(5, 9, 7);
    scene.add(key);
    var rim = new THREE.DirectionalLight(0xFFFA00, 0.55);
    rim.position.set(-6, -3, 5);
    scene.add(rim);
    var root = new THREE.Group();
    scene.add(root);
    var state = {
      variant: -1, built: null, paused: false, disposed: false, raf: 0,
      t0: performance.now(), last: 0, visible: true, mountT: performance.now(), reduce: false,
      px: 0, py: 0, tpx: 0, tpy: 0
    };
    canvas.addEventListener('pointermove', function (e) {
      var r = canvas.getBoundingClientRect();
      state.tpx = ((e.clientX - r.left) / Math.max(1, r.width) - 0.5) * 2;
      state.tpy = ((e.clientY - r.top) / Math.max(1, r.height) - 0.5) * 2;
    }, { passive: true });
    canvas.addEventListener('pointerleave', function () { state.tpx = 0; state.tpy = 0; });
    var colors = COL[theme];
    var ro = window.ResizeObserver ? new ResizeObserver(resize) : null;
    var io = null;

    function resize() {
      var r = canvas.getBoundingClientRect();
      var w = Math.max(1, Math.round(r.width));
      var h = Math.max(1, Math.round(r.height));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    function setVariant(i) {
      if (state.disposed) return;
      if (i === state.variant) return;
      state.variant = i;
      /* hard cut: remove and dispose every previous model, then clear the frame
         before the new one is drawn — no ghost/stacked viewers on any GPU */
      if (state.built) {
        root.remove(state.built.group);
        state.built.dispose();
        state.built = null;
      }
      while (root.children.length) root.remove(root.children[0]);
      renderer.clear(true, true, true);
      state.built = buildVariant(kind, i, colors);
      root.add(state.built.group);
      state.mountT = performance.now();
      renderer.render(scene, camera);
    }

    function loop(now) {
      state.raf = requestAnimationFrame(loop);
      if (state.paused || state.disposed || !state.visible) return;
      var t = (now - state.t0) / 1000;
      var dt = state.last ? Math.min(0.05, (now - state.last) / 1000) : 0.016;
      state.last = now;
      var bp = state.reduce ? 1 : Math.min(1, (now - state.mountT) / 700);
      var ease = 1 - Math.pow(1 - bp, 3);
      root.scale.setScalar(state.reduce ? 1 : 0.28 + 0.72 * ease);
      state.px += (state.tpx - state.px) * 0.06;
      state.py += (state.tpy - state.py) * 0.06;
      root.rotation.y = (state.reduce ? 0 : (1 - ease) * 0.9) + state.px * 0.22;
      root.rotation.x = -state.py * 0.12;
      if (state.built) state.built.tick(t, dt);
      renderer.render(scene, camera);
    }

    function applyTheme(next) {
      theme = next === 'light' ? 'light' : 'dark';
      colors = COL[theme];
      var v = state.variant;
      if (state.built) { state.built.dispose(); state.built = null; }
      state.variant = -1;
      if (v >= 0) setVariant(v);
    }

    state.reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    resize();
    if (ro) ro.observe(canvas); else window.addEventListener('resize', resize);
    if (window.IntersectionObserver) {
      io = new IntersectionObserver(function (en) { state.visible = en[0].isIntersecting; }, { rootMargin: '160px' });
      io.observe(canvas);
    }
    state.raf = requestAnimationFrame(loop);
    return {
      setVariant: setVariant,
      replay: function () { state.mountT = performance.now(); },
      setTheme: applyTheme,
      pause: function () { state.paused = true; },
      resume: function () { state.paused = false; },
      resize: resize,
      dispose: function () {
        state.disposed = true;
        cancelAnimationFrame(state.raf);
        if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
        if (io) io.disconnect();
        if (state.built) state.built.dispose();
        renderer.dispose();
        if (renderer.forceContextLoss) renderer.forceContextLoss();
      }
    };
  }

  window.GoldenSpecimen = { mount: mount };
})();
