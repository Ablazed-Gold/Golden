/* BOOT SCENE — 3D lattice that assembles while the 2D wordmark holds the frame.
   three.js r149 (UMD, global THREE). Classic script. No deps. */
(function () {
  'use strict';
  var THREE = window.THREE;
  var CINK = 0xEDEDED, CSIG = 0xFFFA00, CDARK = 0x1C1C1C;

  function Boot() {
    this.canvas = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.group = null;
    this.cubes = [];
    this.rings = [];
    this.scan = null;
    this.raf = 0;
    this.t0 = performance.now();
    this.assembled = false;
    this.finished = false;
    this.firstFrame = false;
    this.reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.ready = new Promise(function (res) { Boot._resolveReady = res; }, this);
    Boot._instance = this;
  }
  Boot._resolveReady = null;

  Boot.prototype.mount = function () {
    if (this.renderer) return;
    var canvas = document.getElementById('boot-canvas');
    if (!canvas || !THREE || !window.__hasWebGL) { if (Boot._resolveReady) Boot._resolveReady(false); return; }
    this.canvas = canvas;
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch (e) { if (Boot._resolveReady) Boot._resolveReady(false); return; }
    this.renderer = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    this.camera.position.set(0, 0.6, 9.4);

    this.group = new THREE.Group();
    this.scene.add(this.group);

    var i, x, y, z, n = 0;
    for (x = -1; x <= 1; x++) {
      for (y = -1; y <= 1; y++) {
        for (z = -1; z <= 1; z++) {
          var g = new THREE.BoxGeometry(0.42, 0.42, 0.42);
          var mat = new THREE.MeshBasicMaterial({ color: CDARK, transparent: true, opacity: 0.9 });
          var mesh = new THREE.Mesh(g, mat);
          var eg = new THREE.EdgesGeometry(g);
          var isAccent = (x === 1 && y === 1) || (x === -1 && y === 0 && z === 1);
          var lineMat = new THREE.LineBasicMaterial({ color: isAccent ? CSIG : CINK, transparent: true, opacity: isAccent ? 0.9 : 0.34 });
          var edges = new THREE.LineSegments(eg, lineMat);
          mesh.add(edges);
          mesh.userData = {
            i: n,
            target: new THREE.Vector3(x * 0.62, y * 0.62, z * 0.62),
            start: new THREE.Vector3(
              (Math.random() - 0.5) * 16,
              (Math.random() - 0.5) * 12,
              (Math.random() - 0.5) * 12 - 4
            ),
            delay: n * 0.014 + Math.random() * 0.12,
            spin: new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1),
            edges: edges,
            lineMat: lineMat
          };
          mesh.position.copy(mesh.userData.start);
          mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
          mesh.scale.setScalar(0.7);
          this.group.add(mesh);
          this.cubes.push(mesh);
          n++;
        }
      }
    }

    /* outer technical cage */
    var cageGeo = new THREE.BoxGeometry(2.7, 2.7, 2.7);
    this.cage = new THREE.LineSegments(
      new THREE.EdgesGeometry(cageGeo),
      new THREE.LineBasicMaterial({ color: CINK, transparent: true, opacity: 0.16 })
    );
    this.group.add(this.cage);

    /* three hex dial rings */
    var self = this;
    [2.05, 2.5, 3.0].forEach(function (r, idx) {
      var pts = [];
      for (var k = 0; k <= 6; k++) {
        var a = (k / 6) * Math.PI * 2 + Math.PI / 6;
        pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
      }
      var geo = new THREE.BufferGeometry().setFromPoints(pts);
      var mat = new THREE.LineBasicMaterial({
        color: idx === 1 ? CSIG : CINK,
        transparent: true,
        opacity: idx === 1 ? 0.55 : 0.2
      });
      var ring = new THREE.Line(geo, mat);
      ring.rotation.x = Math.PI / 2 + (idx - 1) * 0.16;
      ring.rotation.y = idx * 0.2;
      ring.userData.speed = 0.06 + idx * 0.03;
      self.group.add(ring);
      self.rings.push(ring);
    });

    /* tick marks around the widest ring */
    var tickPts = [];
    for (var t = 0; t < 72; t++) {
      var ang = (t / 72) * Math.PI * 2;
      var r1 = 3.0, r2 = t % 6 === 0 ? 3.24 : 3.12;
      tickPts.push(new THREE.Vector3(Math.cos(ang) * r1, 0, Math.sin(ang) * r1));
      tickPts.push(new THREE.Vector3(Math.cos(ang) * r2, 0, Math.sin(ang) * r2));
    }
    var tickGeo = new THREE.BufferGeometry().setFromPoints(tickPts);
    this.ticks = new THREE.LineSegments(tickGeo, new THREE.LineBasicMaterial({ color: CINK, transparent: true, opacity: 0.18 }));
    this.ticks.rotation.x = Math.PI / 2;
    this.group.add(this.ticks);

    /* single scan pass */
    var scanGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-2.6, 0, -2.6), new THREE.Vector3(2.6, 0, -2.6),
      new THREE.Vector3(2.6, 0, 2.6), new THREE.Vector3(-2.6, 0, 2.6),
      new THREE.Vector3(-2.6, 0, -2.6)
    ]);
    this.scan = new THREE.Line(scanGeo, new THREE.LineBasicMaterial({ color: CSIG, transparent: true, opacity: 0 }));
    this.scan.position.y = -1.8;
    this.group.add(this.scan);

    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize, { passive: true });
    this.resize();
    this.t0 = performance.now();
    this.loop();
  };

  Boot.prototype.resize = function () {
    if (!this.renderer) return;
    var w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w < 720 ? 46 : 34;
    this.camera.updateProjectionMatrix();
  };

  Boot.prototype.loop = function () {
    var self = this;
    this.raf = requestAnimationFrame(function () { self.loop(); });
    if (this.finished) return;
    var t = (performance.now() - this.t0) / 1000;
    var dur = this.reduce ? 0.001 : 1.65;

    for (var i = 0; i < this.cubes.length; i++) {
      var m = this.cubes[i], u = m.userData;
      var p = this.reduce ? 1 : Math.min(1, Math.max(0, (t - u.delay) / dur));
      var e = 1 - Math.pow(1 - p, 4); /* snap: fast in, hard settle */
      m.position.lerpVectors(u.start, u.target, e);
      m.rotation.x = (1 - e) * u.spin.x * 3;
      m.rotation.y = (1 - e) * u.spin.y * 3;
      m.rotation.z = (1 - e) * u.spin.z * 3;
      m.scale.setScalar(0.7 + 0.3 * e);
      u.lineMat.opacity = (u.lineMat.color.getHex() === CSIG ? 0.9 : 0.34) * (0.25 + 0.75 * e);
    }

    var gt = this.reduce ? 0 : t;
    this.group.rotation.y = gt * 0.18;
    this.group.rotation.x = Math.sin(gt * 0.22) * 0.1 + 0.12;
    this.cage.rotation.y = -gt * 0.1;
    this.cage.scale.setScalar(1 + Math.sin(gt * 0.6) * 0.008);

    for (var r = 0; r < this.rings.length; r++) {
      var ring = this.rings[r];
      ring.rotation.z = gt * ring.userData.speed;
      ring.rotation.y = ring.rotation.y + 0.0015;
    }
    this.ticks.rotation.z = -gt * 0.05;

    /* one scan pass between 0.7s and 1.9s */
    var sp = (t - 0.7) / 1.2;
    if (sp > 0 && sp < 1) {
      this.scan.position.y = -1.8 + sp * 3.6;
      this.scan.material.opacity = 0.7 * Math.sin(sp * Math.PI);
    } else {
      this.scan.material.opacity = 0;
    }

    this.renderer.render(this.scene, this.camera);
    if (!this.firstFrame) {
      this.firstFrame = true;
      if (Boot._resolveReady) Boot._resolveReady(true);
    }
  };

  Boot.prototype.finish = function () {
    this.finished = true;
  };

  Boot.prototype.dispose = function () {
    this.finished = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
    if (!this.renderer) return;
    this.scene.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach(function (mm) { mm.dispose(); });
        else o.material.dispose();
      }
    });
    this.renderer.dispose();
    if (this.renderer.forceContextLoss) this.renderer.forceContextLoss();
    this.renderer = null;
  };

  Boot.prototype.setTheme = function (dark) {
    /* boot runs on the same paper background; the light theme is disabled during boot */
    if (!this.scene) return;
    this.scene.traverse(function (o) {
      if (o.material && o.material.color && o.material.isLineBasicMaterial) {
        var isSig = o.material.color.getHex() === CSIG;
        if (!isSig) o.material.color.setHex(dark ? CINK : 0x161616);
      }
    });
  };

  var instance = new Boot();
  instance.mount = instance.mount.bind(instance);
  instance.ready = instance.ready;
  window.GoldenBoot = {
    ready: instance.ready,
    finish: function () { instance.finish(); },
    dispose: function () { instance.dispose(); },
    setTheme: function (d) { instance.setTheme(d); }
  };
  if (document.readyState !== 'loading') instance.mount();
  else document.addEventListener('DOMContentLoaded', function () { instance.mount(); });
})();
