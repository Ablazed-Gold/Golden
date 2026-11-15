/* HERO SCENE — hexagonal core, dial rings, data cloud. three.js r149 UMD. */
(function () {
  'use strict';
  var THREE = window.THREE;
  var CC = {
    dark: { ink: 0xEDEDED, dim: 0x8A8A8A, plate: 0x1E1E1E, sig: 0xFFFA00, sigLine: 0xFFFA00 },
    light: { ink: 0x161616, dim: 0x6A6A6A, plate: 0xE8E8E4, sig: 0xFFFA00, sigLine: 0x161616 }
  };

  var S = {
    mounted: false, paused: false, raf: 0, t0: 0, theme: 'dark',
    px: 0, py: 0, tpx: 0, tpy: 0, scroll: 0, reduce: false,
    scene: null, camera: null, renderer: null, canvas: null,
    world: null, rings: [], plates: [], core: null, points: [], dial: null,
    scan: null, scanT: -99, hover: 0, accentMats: [], bursts: [], kick: 0
  };

  function accentMat(opacity) {
    var m = new THREE.LineBasicMaterial({
      color: CC[S.theme].sigLine, transparent: true, opacity: opacity
    });
    S.accentMats.push(m);
    return m;
  }

  function mat(color, opacity, line) {
    return line
      ? new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: opacity })
      : new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: opacity });
  }

  function hexRing(radius, color, opacity) {
    var pts = [];
    for (var k = 0; k <= 6; k++) {
      var a = (k / 6) * Math.PI * 2 + Math.PI / 6;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
    }
    var geo = new THREE.BufferGeometry().setFromPoints(pts);
    return new THREE.Line(geo, mat(color, opacity, true));
  }

  function build() {
    var th = CC[S.theme];
    S.scene = new THREE.Scene();
    S.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);
    S.camera.position.set(0, 0.2, 11);

    S.world = new THREE.Group();
    S.scene.add(S.world);

    /* core: three stacked hex plates facing the viewer */
    S.core = new THREE.Group();
    S.core.rotation.z = Math.PI / 6;
    S.world.add(S.core);

    for (var p = 0; p < 3; p++) {
      var radius = 2.35 - p * 0.42;
      var g = new THREE.CylinderGeometry(radius, radius, 0.16, 6, 1, false, Math.PI / 6);
      g.rotateX(Math.PI / 2);
      var m = new THREE.Mesh(g, mat(th.plate, p === 0 ? 0.92 : 0.65, false));
      m.position.z = (p - 1) * 0.46;
      var edgeMat = p === 1 ? accentMat(0.6) : mat(th.ink, 0.3, true);
      var edges = new THREE.LineSegments(new THREE.EdgesGeometry(g), edgeMat);
      m.add(edges);
      m.userData.edgeMat = edgeMat;
      S.core.add(m);
      S.plates.push(m);
    }

    /* rings at different tilts */
    var ringCfg = [
      { r: 3.0, tilt: 0.0, speed: 0.10, op: 0.22, sig: false },
      { r: 3.55, tilt: 0.55, speed: -0.07, op: 0.16, sig: false },
      { r: 4.15, tilt: -0.42, speed: 0.05, op: 0.30, sig: true }
    ];
    ringCfg.forEach(function (c, i) {
      var ring = hexRing(c.r, th.ink, c.op);
      if (c.sig) { ring.material.dispose(); ring.material = accentMat(c.op + 0.08); }
      ring.rotation.x = c.tilt;
      ring.rotation.y = c.tilt * 0.8;
      ring.userData = { speed: c.speed, baseX: c.tilt, baseY: c.tilt * 0.8 };
      S.world.add(ring);
      S.rings.push(ring);
    });

    /* dial ticks */
    var tickPts = [];
    for (var t = 0; t < 60; t++) {
      var a = (t / 60) * Math.PI * 2;
      var r1 = 4.55, r2 = t % 5 === 0 ? 4.85 : 4.7;
      tickPts.push(new THREE.Vector3(Math.cos(a) * r1, Math.sin(a) * r1, 0));
      tickPts.push(new THREE.Vector3(Math.cos(a) * r2, Math.sin(a) * r2, 0));
    }
    S.dial = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(tickPts), mat(th.ink, 0.18, true));
    S.world.add(S.dial);

    /* data cloud: points inside a hexagonal prism */
    var posArr = [], colArr = [], count = 1400;
    var sig = new THREE.Color(th.sig), ink = new THREE.Color(th.ink);
    for (var i = 0; i < count; i++) {
      var rr = Math.pow(Math.random(), 0.6) * 3.1;
      var ang = Math.random() * Math.PI * 2;
      var y = (Math.random() - 0.5) * Math.pow(Math.random(), 0.5) * 3.6;
      /* bias toward a hex outline */
      var hx = Math.cos(ang) * rr;
      var hy = Math.sin(ang) * rr;
      if (Math.random() < 0.55) {
        var edge = Math.floor(Math.random() * 6);
        var fa = (edge / 6) * Math.PI * 2 + Math.PI / 6;
        var fb = ((edge + 1) / 6) * Math.PI * 2 + Math.PI / 6;
        var u = Math.random();
        hx = (Math.cos(fa) * (1 - u) + Math.cos(fb) * u) * 3.0;
        hy = (Math.sin(fa) * (1 - u) + Math.sin(fb) * u) * 3.0;
      }
      posArr.push(hx, y, hy * 0.4 + (Math.random() - 0.5) * 1.2);
      var c = Math.random() < 0.05 ? sig : ink;
      colArr.push(c.r, c.g, c.b);
    }
    var pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
    pg.setAttribute('color', new THREE.Float32BufferAttribute(colArr, 3));
    S.pointCloud = new THREE.Points(pg, new THREE.PointsMaterial({
      size: 0.035, vertexColors: true, transparent: true, opacity: 0.75, sizeAttenuation: true
    }));
    S.world.add(S.pointCloud);

    /* three satellite cubes on the outer ring */
    var satGeo = new THREE.BoxGeometry(0.24, 0.24, 0.24);
    for (var s = 0; s < 3; s++) {
      var sat = new THREE.Mesh(satGeo, mat(th.plate, 0.9, false));
      var satEdges = new THREE.LineSegments(new THREE.EdgesGeometry(satGeo), s % 1 === 0 ? accentMat(0.75) : mat(th.ink, 0.7, true));
      sat.add(satEdges);
      sat.userData = { a: (s / 3) * Math.PI * 2 + 0.4, r: 3.9 + s * 0.16, z: (s - 1) * 0.5, spin: 0.4 + s * 0.2 };
      S.world.add(sat);
      S.plates.push(sat);
    }

    /* scan ring (single pass) */
    S.scan = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-5.4, 0, 0), new THREE.Vector3(5.4, 0, 0)
      ]),
      accentMat(0)
    );
    S.scan.position.y = 4.4;
    S.world.add(S.scan);

    /* deep warp corridor behind the core: wireframe frames drifting forward */
    S.tunnel = new THREE.Group();
    S.scene.add(S.tunnel);
    S.frames = [];
    var frameGeoPts = [
      new THREE.Vector3(-1.5, -1.5, 0), new THREE.Vector3(1.5, -1.5, 0),
      new THREE.Vector3(1.5, -1.5, 0), new THREE.Vector3(1.5, 1.5, 0),
      new THREE.Vector3(1.5, 1.5, 0), new THREE.Vector3(-1.5, 1.5, 0),
      new THREE.Vector3(-1.5, 1.5, 0), new THREE.Vector3(-1.5, -1.5, 0)
    ];
    for (var f = 0; f < 26; f++) {
      var fg = new THREE.BufferGeometry().setFromPoints(frameGeoPts);
      var fl = f % 7 === 0 ? new THREE.LineSegments(fg, accentMat(0.16)) : new THREE.LineSegments(fg, mat(th.ink, 0.10, true));
      fl.position.z = -6 - f * 1.9;
      fl.scale.setScalar(1 + (f % 5) * 0.22);
      fl.rotation.z = (f % 6) * 0.18;
      fl.userData = { base: fl.position.z, spin: (f % 2 ? 1 : -1) * 0.02 };
      S.tunnel.add(fl);
      S.frames.push(fl);
    }
    S.tunnel.rotation.x = -0.05;

    S.world.rotation.x = -0.08;
  }

  function applyTheme() {
    if (!S.scene) return;
    var th = CC[S.theme];
    var ink = new THREE.Color(th.ink), plate = new THREE.Color(th.plate), dim = new THREE.Color(th.dim);
    S.scene.traverse(function (o) {
      if (!o.material) return;
      var ms = Array.isArray(o.material) ? o.material : [o.material];
      ms.forEach(function (m) {
        if (!m.color) return;
        var h = m.color.getHex();
        if (h === CC.dark.ink || h === CC.light.ink) m.color.copy(ink);
        else if (h === CC.dark.plate || h === CC.light.plate) m.color.copy(plate);
        else if (h === CC.dark.dim || h === CC.light.dim) m.color.copy(dim);
      });
    });
    if (S.pointCloud) {
      var arr = S.pointCloud.geometry.attributes.color;
      for (var i = 0; i < arr.count; i++) {
        var isSig = Math.abs(arr.getX(i) - 1) < 0.01 && Math.abs(arr.getY(i) - 0.98) < 0.05;
        var c = isSig ? new THREE.Color(th.sig) : ink;
        arr.setXYZ(i, c.r, c.g, c.b);
      }
      arr.needsUpdate = true;
    }
    for (var a = 0; a < S.accentMats.length; a++) S.accentMats[a].color.setHex(th.sigLine);
  }

  function resize() {
    if (!S.renderer) return;
    var w = S.canvas.clientWidth || window.innerWidth;
    var h = S.canvas.clientHeight || window.innerHeight;
    S.renderer.setSize(w, h, false);
    S.camera.aspect = w / Math.max(1, h);
    S.camera.updateProjectionMatrix();
    var small = w < 900;
    S.world.position.x = small ? 0 : 2.1;
    S.world.position.y = small ? 0.4 : 0;
    S.world.scale.setScalar(small ? 0.6 : 1.04);
  }

  function ringCircle(r, seg) {
    var pts = [];
    for (var i = 0; i <= seg; i++) {
      var a = (i / seg) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }

  function pulse() {
    if (!S.mounted || S.reduce || !S.world) return;
    var th = CC[S.theme];
    var count = 220;
    var pos = new Float32Array(count * 3);
    var col = new Float32Array(count * 3);
    var vel = [];
    var sig = new THREE.Color(th.sig), ink = new THREE.Color(th.ink);
    for (var i = 0; i < count; i++) {
      var a = Math.random() * Math.PI * 2;
      var e = Math.acos(2 * Math.random() - 1);
      var speed = 1.6 + Math.random() * 4.2;
      var dir = new THREE.Vector3(
        Math.sin(e) * Math.cos(a),
        Math.sin(e) * Math.sin(a) * 0.62,
        Math.cos(e) * 0.7
      );
      pos[i * 3] = 0; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = 0;
      var c = Math.random() < 0.28 ? sig : ink;
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      vel.push(dir.multiplyScalar(speed));
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    var pmat = new THREE.PointsMaterial({ size: 0.07, vertexColors: true, transparent: true, opacity: 1, sizeAttenuation: true });
    var pts = new THREE.Points(geo, pmat);
    S.world.add(pts);
    var ring = new THREE.Line(ringCircle(1.2, 96), accentMat(0.95));
    ring.position.z = 0.4;
    S.world.add(ring);
    var ring2 = new THREE.Line(ringCircle(0.8, 72), mat(th.ink, 0.55, true));
    ring2.position.z = 0.45;
    S.world.add(ring2);
    S.bursts.push({ pts: pts, ring: ring, ring2: ring2, vel: vel, life: 0 });
    S.kick = 1.15;
    try { window.dispatchEvent(new CustomEvent('goldenhero:pulse')); } catch (err) {}
  }

  function frame(now) {
    S.raf = requestAnimationFrame(frame);
    if (S.paused) return;
    var t = (now - S.t0) / 1000;
    var dt = S.lastNow ? Math.min(0.05, (now - S.lastNow) / 1000) : 0.016;
    S.lastNow = now;

    S.px += (S.tpx - S.px) * 0.06;
    S.py += (S.tpy - S.py) * 0.06;

    var sy = S.scroll;
    S.camera.position.z = 11 - Math.min(1, sy / 1800) * 3.2 - S.kick * 0.5;
    S.kick *= 0.88;
    S.world.rotation.y = S.px * 0.32 + sy * 0.0012;
    S.world.rotation.x = -0.08 + S.py * 0.18;
    S.world.position.y = (window.innerWidth < 900 ? 0.4 : 0) + Math.sin(t * 0.5) * 0.12 - Math.min(sy / 1400, 1) * 1.6;
    S.core.rotation.z = Math.PI / 6 + Math.sin(t * 0.24) * 0.05;
    S.core.rotation.y = S.px * 0.2;

    for (var i = 0; i < S.rings.length; i++) {
      var r = S.rings[i], u = r.userData;
      r.rotation.z = t * u.speed;
      r.rotation.x = u.baseX + Math.sin(t * 0.18 + i) * 0.08;
      r.rotation.y = u.baseY + Math.cos(t * 0.14 + i) * 0.06;
    }
    S.dial.rotation.z = -t * 0.045 + S.px * 0.1;
    S.dial.scale.setScalar(1 + Math.sin(t * 0.8) * 0.004);

    for (var p = 0; p < S.plates.length; p++) {
      var pl = S.plates[p];
      if (pl.userData && pl.userData.r) {
        var a = pl.userData.a + t * 0.12;
        pl.position.set(Math.cos(a) * pl.userData.r, Math.sin(a) * pl.userData.r, pl.userData.z);
        pl.rotation.x = t * pl.userData.spin;
        pl.rotation.y = t * pl.userData.spin * 0.7;
      } else {
        pl.position.z = (p - 1) * 0.46 + Math.sin(t * 0.6 + p) * 0.03;
      }
    }
    S.pointCloud.rotation.y = t * 0.02 + S.px * 0.12;
    S.pointCloud.rotation.z = Math.sin(t * 0.1) * 0.04;

    if (S.frames) {
      for (var fi = 0; fi < S.frames.length; fi++) {
        var fr = S.frames[fi];
        fr.position.z += dt * (1.1 + fi * 0.03);
        if (fr.position.z > -4) fr.position.z = -52 - (fi % 4) * 0.9;
        fr.rotation.z += dt * fr.userData.spin;
        fr.material.opacity = 0.06 + 0.10 * Math.min(1, (fr.position.z + 52) / 48);
      }
      S.tunnel.rotation.z = t * 0.008 + S.px * 0.05;
    }

    /* scan pass every 9s */
    if (t - S.scanT > 9) S.scanT = t;
    var sp = (t - S.scanT) / 1.6;
    if (sp > 0 && sp < 1) {
      S.scan.position.y = 4.6 - sp * 9.2;
      S.scan.material.opacity = 0.85 * Math.sin(sp * Math.PI);
    } else {
      S.scan.material.opacity = 0;
    }

    if (S.bursts.length) {
      for (var bi = S.bursts.length - 1; bi >= 0; bi--) {
        var bst = S.bursts[bi];
        bst.life += dt;
        var arr = bst.pts.geometry.attributes.position;
        for (var pi = 0; pi < bst.vel.length; pi++) {
          var v = bst.vel[pi];
          arr.setXYZ(pi,
            arr.getX(pi) + v.x * dt,
            arr.getY(pi) + v.y * dt,
            arr.getZ(pi) + v.z * dt);
          v.multiplyScalar(0.965);
        }
        arr.needsUpdate = true;
        bst.pts.material.opacity = Math.max(0, 1 - bst.life / 1.25);
        bst.ring.scale.setScalar(1 + bst.life * 3.6);
        bst.ring.material.opacity = Math.max(0, 0.95 - bst.life / 0.85);
        if (bst.ring2) {
          bst.ring2.scale.setScalar(1 + bst.life * 2.2);
          bst.ring2.material.opacity = Math.max(0, 0.55 - bst.life);
        }
        if (bst.life > 1.3) {
          S.world.remove(bst.pts);
          S.world.remove(bst.ring);
          if (bst.ring2) S.world.remove(bst.ring2);
          bst.pts.geometry.dispose(); bst.pts.material.dispose();
          bst.ring.geometry.dispose();
          if (bst.ring2) { bst.ring2.geometry.dispose(); bst.ring2.material.dispose(); }
          S.bursts.splice(bi, 1);
        }
      }
    }

    S.renderer.render(S.scene, S.camera);
  }

  var api = {
    mount: function () {
      if (S.mounted || !THREE || !window.__hasWebGL) return;
      var canvas = document.getElementById('hero-canvas');
      if (!canvas) return;
      try {
        S.renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
      } catch (e) { return; }
      S.canvas = canvas;
      S.reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      S.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
      S.theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
      build();
      resize();
      S.mounted = true;
      S.t0 = performance.now();
      window.addEventListener('resize', resize, { passive: true });
      window.addEventListener('pointermove', function (e) {
        S.tpx = (e.clientX / window.innerWidth) * 2 - 1;
        S.tpy = (e.clientY / window.innerHeight) * 2 - 1;
      }, { passive: true });
      window.addEventListener('scroll', function () {
        S.scroll = window.scrollY || 0;
      }, { passive: true });
      var heroEl = document.getElementById('hero');
      if (heroEl) {
        heroEl.addEventListener('pointerdown', function (e) {
          if (e.target.closest && e.target.closest('a,button')) return;
          pulse();
        }, { passive: true });
      }
      if (S.reduce) { S.renderer.render(S.scene, S.camera); return; }
      S.raf = requestAnimationFrame(frame);
    },
    pulse: pulse,
    pause: function () { S.paused = true; },
    resume: function () { S.paused = false; },
    setTheme: function (theme) { S.theme = theme; if (S.mounted) applyTheme(); },
    isMounted: function () { return S.mounted; }
  };

  window.GoldenHero = api;
})();
