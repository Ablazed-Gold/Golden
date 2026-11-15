/* CITY — a 3D printer builds a stylized Shenzhen CBD: Ping An Finance Center,
   the surrounding tower cluster and Shenzhen Bay. Procedural geometry based on
   public dimensions (Ping An 600m / 118 floors, KK100 442m, China Resources
   Tower 392m). three.js r149 UMD. */
(function () {
  'use strict';
  var THREE = window.THREE;
  if (!THREE) { window.GoldenCity = { mount: function () { return null; } }; return; }

  var COL = {
    dark: { ink: 0xEDEDED, dim: 0x6F6F6F, plate: 0x333333, ground: 0x121212, water: 0x14252E, accent: 0xFFFA00, shade: [0x363636, 0x3F3F3F, 0x4A4A4A, 0x2E2E2E] },
    light: { ink: 0x161616, dim: 0x8A8A8A, plate: 0xDCDBD5, ground: 0xEFEEE9, water: 0xC9D6D8, accent: 0xFFFA00, shade: [0xD5D4CE, 0xCBCAC4, 0xE0DFD9, 0xC0BFB9] }
  };

  var S = {
    mounted: false, playing: false, stage: 'idle', printP: 0, complete: false,
    bg: false, paused: false, raf: 0, t0: 0, theme: 'dark', w: 0, h: 0,
    scene: null, camera: null, renderer: null, canvas: null, world: null,
    buildings: null, bData: [], landmarks: [], gantry: null, front: null,
    water: null, waves: [], ground: null, grid: null, camPos: null, camLook: null,
    targetPos: null, targetLook: null, reduce: false, onLayer: null,
    lastCam: null, frameSkip: 0
  };

  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function mat(color, opacity, line) {
    return line
      ? new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: opacity == null ? 0.9 : opacity })
      : new THREE.MeshLambertMaterial({ color: color, transparent: true, opacity: opacity == null ? 1 : opacity });
  }

  function boxMesh(w, h, d, color, opacity) {
    var g = new THREE.BoxGeometry(w, h, d);
    var m = new THREE.Mesh(g, mat(color, opacity));
    m.userData.role = 'plate';
    return m;
  }

  function squareFrustum(topR, bottomR, h, color, ink, opacity) {
    var g = new THREE.CylinderGeometry(topR, bottomR, h, 4, 1);
    g.rotateY(Math.PI / 4);
    var m = new THREE.Mesh(g, mat(color, opacity == null ? 1 : opacity));
    m.userData.role = 'plate';
    var e = new THREE.LineSegments(new THREE.EdgesGeometry(g), mat(ink, 0.7, true));
    e.userData.role = 'ink';
    m.add(e);
    return m;
  }

  function addLandmark(x, z, builder) {
    var group = new THREE.Group();
    group.position.set(x, 0, z);
    builder(group);
    var top = 0;
    group.traverse(function (o) { if (o.geometry && o.geometry.boundingBox) { o.geometry.computeBoundingBox(); } });
    S.world.add(group);
    var entry = { group: group, h: group.userData.h || 1, delay: 0, topLine: null };
    /* yellow print line at the current top */
    var geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.55, 0, 0), new THREE.Vector3(0.55, 0, 0)]);
    var line = new THREE.Line(geo, mat(COL[S.theme].accent, 0, true));
    line.userData.role = 'accent';
    group.add(line);
    entry.topLine = line;
    S.landmarks.push(entry);
    return entry;
  }

  function buildPingAn(g) {
    var ink = COL[S.theme].ink, plate = COL[S.theme].plate;
    var segs = [
      { y: 0.22, h: 0.44, bt: 0.46, tp: 0.44 },
      { y: 0.44, h: 1.9, bt: 0.44, tp: 0.36 },
      { y: 2.34, h: 1.9, bt: 0.36, tp: 0.29 },
      { y: 4.24, h: 1.36, bt: 0.29, tp: 0.21 },
      { y: 5.60, h: 0.42, bt: 0.21, tp: 0.15 }
    ];
    segs.forEach(function (s) {
      var m = squareFrustum(s.tp, s.bt, s.h, plate, ink, 1);
      m.position.y = s.y + s.h / 2;
      g.add(m);
    });
    /* podium */
    var pod = boxMesh(1.15, 0.28, 1.15, plate, 1);
    pod.position.y = 0.14;
    g.add(pod);
    var podE = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.15, 0.28, 1.15)), mat(ink, 0.55, true));
    podE.position.y = 0.14;
    podE.userData.role = 'ink';
    g.add(podE);
    /* crown + spire */
    var spire = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 6.02, 0), new THREE.Vector3(0, 6.3, 0)]), mat(ink, 0.85, true));
    spire.userData.role = 'ink';
    g.add(spire);
    g.userData.h = 6.3;
  }

  function buildKK100(g) {
    var ink = COL[S.theme].ink, plate = COL[S.theme].plate;
    var g1 = new THREE.CylinderGeometry(0.2, 0.34, 4.2, 28, 1);
    var m = new THREE.Mesh(g1, mat(plate, 1));
    m.userData.role = 'plate';
    m.scale.x = 0.82;
    m.position.y = 2.1;
    g.add(m);
    var e = new THREE.LineSegments(new THREE.EdgesGeometry(g1), mat(ink, 0.45, true));
    e.userData.role = 'ink';
    e.scale.x = 0.82;
    e.position.y = 2.1;
    g.add(e);
    var cap = new THREE.CylinderGeometry(0.06, 0.2, 0.22, 16);
    var cm = new THREE.Mesh(cap, mat(plate, 1));
    cm.position.y = 4.3;
    cm.userData.role = 'plate';
    g.add(cm);
    g.userData.h = 4.42;
  }

  function buildSpringBamboo(g) {
    var ink = COL[S.theme].ink, plate = COL[S.theme].plate;
    var geo = new THREE.CylinderGeometry(0.06, 0.3, 3.9, 6, 1, true);
    var m = new THREE.Mesh(geo, mat(plate, 0.92));
    m.position.y = 1.95;
    m.userData.role = 'plate';
    g.add(m);
    var e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), mat(ink, 0.6, true));
    e.position.y = 1.95;
    e.userData.role = 'ink';
    g.add(e);
    g.userData.h = 3.92;
  }

  function buildExchange(g) {
    var ink = COL[S.theme].ink, plate = COL[S.theme].plate;
    var base = boxMesh(1.0, 0.14, 1.0, plate, 1);
    base.position.y = 0.07;
    g.add(base);
    var slab = boxMesh(1.1, 0.1, 1.1, plate, 1);
    slab.position.y = 0.62;
    g.add(slab);
    var se = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.1, 0.1, 1.1)), mat(ink, 0.6, true));
    se.position.y = 0.62;
    se.userData.role = 'ink';
    g.add(se);
    [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]].forEach(function (p) {
      var col = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(p[0], 0.14, p[1]), new THREE.Vector3(p[0], 0.62, p[1])]), mat(ink, 0.5, true));
      col.userData.role = 'ink';
      g.add(col);
    });
    g.userData.h = 0.76;
  }

  function buildCivic(g) {
    var ink = COL[S.theme].ink, plate = COL[S.theme].plate;
    var roof = boxMesh(1.6, 0.12, 0.8, plate, 1);
    roof.position.y = 0.55;
    g.add(roof);
    var e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.6, 0.12, 0.8)), mat(ink, 0.55, true));
    e.position.y = 0.55;
    e.userData.role = 'ink';
    g.add(e);
    var wingL = boxMesh(0.7, 0.12, 0.5, plate, 1);
    wingL.position.set(-0.9, 0.42, 0);
    wingL.rotation.z = 0.18;
    g.add(wingL);
    var wingR = boxMesh(0.7, 0.12, 0.5, plate, 1);
    wingR.position.set(0.9, 0.42, 0);
    wingR.rotation.z = -0.18;
    g.add(wingR);
    g.userData.h = 0.7;
  }

  function buildDome(g) {
    var ink = COL[S.theme].ink, plate = COL[S.theme].plate;
    var dome = new THREE.Mesh(new THREE.SphereGeometry(0.55, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(plate, 0.95));
    dome.scale.z = 0.72;
    dome.userData.role = 'plate';
    g.add(dome);
    var e = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(0.56, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2)), mat(ink, 0.35, true));
    e.scale.z = 0.72;
    e.userData.role = 'ink';
    g.add(e);
    g.userData.h = 0.56;
  }

  function coastlineZ(x) {
    return 3.2 + Math.sin(x * 0.22) * 0.55 + Math.cos(x * 0.11 + 1.2) * 0.35;
  }

  function buildGround(col) {
    var ink = col.ink, ground = col.ground;
    var plane = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), mat(ground, 1));
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -0.02;
    plane.userData.role = 'ground';
    S.world.add(plane);

    var pts = [];
    var half = 15, step = 0.5;
    for (var i = -half; i <= half; i += step) {
      pts.push(new THREE.Vector3(i, 0, -half), new THREE.Vector3(i, 0, half));
      pts.push(new THREE.Vector3(-half, 0, i), new THREE.Vector3(half, 0, i));
    }
    var grid = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), mat(ink, 0.10, true));
    grid.userData.role = 'ink';
    S.world.add(grid);
    S.grid = grid;

    /* water: everything behind the coastline curve */
    var shape = new THREE.Shape();
    shape.moveTo(-18, -coastlineZ(-18));
    for (var x = -18; x <= 18; x += 0.5) shape.lineTo(x, -coastlineZ(x));
    shape.lineTo(18, -18);
    shape.lineTo(-18, -18);
    shape.lineTo(-18, -coastlineZ(-18));
    var waterGeo = new THREE.ShapeGeometry(shape);
    waterGeo.rotateX(-Math.PI / 2);
    var water = new THREE.Mesh(waterGeo, new THREE.MeshLambertMaterial({ color: col.water, transparent: true, opacity: 0 }));
    water.position.y = 0.01;
    water.userData.role = 'water';
    S.world.add(water);
    S.water = water;

    /* wave lines */
    for (var w = 0; w < 9; w++) {
      var linePts = [];
      for (var wx = -15; wx <= 15; wx += 0.6) {
        linePts.push(new THREE.Vector3(wx, 0.02, coastlineZ(wx) + 0.5 + w * 0.9));
      }
      var wl = new THREE.Line(new THREE.BufferGeometry().setFromPoints(linePts), mat(col.ink, 0.10, true));
      wl.userData.role = 'ink';
      wl.userData.baseZ = 0.5 + w * 0.9;
      wl.visible = false;
      S.world.add(wl);
      S.waves.push(wl);
    }

    /* coastline */
    var coastPts = [];
    for (var cx = -15; cx <= 15; cx += 0.25) coastPts.push(new THREE.Vector3(cx, 0.03, coastlineZ(cx)));
    var coast = new THREE.Line(new THREE.BufferGeometry().setFromPoints(coastPts), mat(ink, 0.5, true));
    coast.userData.role = 'ink';
    S.world.add(coast);

    /* northern hills */
    var hillPts = [];
    for (var hx = -16; hx <= 16; hx += 0.4) {
      var hz = -10.5 - Math.cos(hx * 0.3) * 0.8 - Math.random() * 0.4;
      var hy = 0.35 + Math.abs(Math.sin(hx * 0.42)) * 0.9;
      hillPts.push(new THREE.Vector3(hx, hy, hz));
    }
    var hill = new THREE.Line(new THREE.BufferGeometry().setFromPoints(hillPts), mat(ink, 0.18, true));
    hill.userData.role = 'ink';
    S.world.add(hill);
  }

  function buildCity() {
    var rnd = rng(20261115);
    var mobile = window.innerWidth < 900;
    var data = [];
    var step = 0.44;
    for (var gx = -7.4; gx <= 7.4; gx += step) {
      for (var gz = -7.4; gz <= 7.4; gz += step) {
        var x = gx + (rnd() - 0.5) * 0.08;
        var z = gz + (rnd() - 0.5) * 0.08;
        if (z > coastlineZ(x) - 0.6) continue;
        var d = Math.sqrt(x * x + z * z);
        if (d > 8.6) continue;
        if (Math.hypot(x - 0.2, z + 0.2) < 1.1) continue;       /* Ping An block */
        if (Math.hypot(x - 5.2, z + 1.2) < 0.8) continue;       /* KK100 block */
        if (Math.hypot(x + 5.0, z - 1.0) < 0.8) continue;       /* spring bamboo */
        if (Math.hypot(x - 2.2, z - 1.8) < 0.8) continue;       /* exchange */
        if (Math.hypot(x + 1.8, z - 2.6) < 0.95) continue;      /* civic */
        if (Math.hypot(x + 4.8, z - 4.2) < 0.8) continue;       /* dome */
        var chance = d < 4.6 ? 0.8 : 0.58;
        if (rnd() > chance) continue;
        if (mobile && rnd() < 0.4) continue;
        var base = Math.max(0.35, 2.5 - d * 0.30);
        var h = base * (0.45 + rnd() * 0.85);
        if (rnd() < 0.06) h *= 1.7;
        var w = 0.18 + rnd() * 0.22;
        var dd = 0.18 + rnd() * 0.22;
        data.push({ x: x, z: z, w: w, d: dd, h: h, delay: Math.max(0, Math.min(0.72, (x + 7.4) / 14.8 * 0.62 + rnd() * 0.12)) });
      }
    }
    S.bData = data;
    var geo = new THREE.BoxGeometry(1, 1, 1);
    var material = new THREE.MeshLambertMaterial({ color: 0xffffff });
    var mesh = new THREE.InstancedMesh(geo, material, data.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.userData.role = 'buildings';
    var shades = COL[S.theme].shade;
    for (var i = 0; i < data.length; i++) {
      mesh.setColorAt(i, new THREE.Color(shades[i % shades.length]));
    }
    S.world.add(mesh);
    S.buildings = mesh;
    var topGeo = new THREE.BoxGeometry(1, 1, 1);
    var topMat = new THREE.MeshBasicMaterial({ color: COL[S.theme].accent, transparent: true, opacity: 0.8 });
    var tops = new THREE.InstancedMesh(topGeo, topMat, 90);
    tops.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    tops.count = 0;
    tops.frustumCulled = false;
    tops.userData.role = 'accent';
    S.world.add(tops);
    S.tops = tops;
    S.dummy = new THREE.Object3D();
    writeBuildings(0);
  }

  function writeBuildings(p) {
    if (!S.buildings) return;
    var d = S.bData;
    var dm = S.dummy;
    var tops = 0;
    for (var i = 0; i < d.length; i++) {
      var b = d[i];
      var q = Math.max(0, Math.min(1, (p - b.delay) / 0.34));
      /* quantize so towers rise in discrete printed layers, not a smooth extrusion */
      var steps = 12;
      var e = q <= 0 ? 0.0001 : Math.floor(q * steps) / steps;
      if (e <= 0) e = 0.0001;
      dm.position.set(b.x, (b.h * e) / 2, b.z);
      dm.scale.set(b.w, b.h * e, b.d);
      dm.rotation.set(0, 0, 0);
      dm.updateMatrix();
      S.buildings.setMatrixAt(i, dm.matrix);
      var frontX = -7.2 + p * 14.4;
      if (S.tops && q > 0 && q < 0.999 && tops < 90 && Math.abs(b.x - frontX) < 1.15) {
        dm.position.set(b.x, b.h * e + 0.006, b.z);
        dm.scale.set(b.w * 1.08, 0.012, b.d * 1.08);
        dm.updateMatrix();
        S.tops.setMatrixAt(tops, dm.matrix);
        tops++;
      }
    }
    S.buildings.instanceMatrix.needsUpdate = true;
    if (S.tops) {
      S.tops.count = tops;
      S.tops.instanceMatrix.needsUpdate = true;
    }
  }

  function buildGantry(col) {
    /* the printer arm is implied by the moving print front and the layer readout;
       a physical gantry at city scale reads as stray wires, so keep only the scan line */
    S.gantry = null;
    var fg = new THREE.BoxGeometry(0.03, 0.7, 16);
    var front = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: col.accent, transparent: true, opacity: 0 }));
    front.position.set(-7, 0.35, 0);
    front.userData.role = 'accent';
    S.world.add(front);
    S.front = front;
    var groundLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.02, -8), new THREE.Vector3(0, 0.02, 8)]), mat(col.accent, 0, true));
    groundLine.userData.role = 'accent';
    S.world.add(groundLine);
    S.frontGround = groundLine;
  }

  function applyTheme() {
    var col = COL[S.theme];
    S.scene.traverse(function (o) {
      if (!o.material || !o.userData.role) return;
      var role = o.userData.role;
      var mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach(function (m) {
        if (!m.color) return;
        if (role === 'ink') m.color.setHex(col.ink);
        else if (role === 'plate') m.color.setHex(col.plate);
        else if (role === 'ground') m.color.setHex(col.ground);
        else if (role === 'water') m.color.setHex(col.water);
        else if (role === 'accent') m.color.setHex(col.accent);
      });
    });
    if (S.buildings) {
      var shades = col.shade;
      for (var i = 0; i < S.bData.length; i++) S.buildings.setColorAt(i, new THREE.Color(shades[i % shades.length]));
      if (S.buildings.instanceColor) S.buildings.instanceColor.needsUpdate = true;
    }
  }

  function resize() {
    if (!S.renderer || !S.canvas) return;
    var w = S.canvas.clientWidth || window.innerWidth;
    var h = S.canvas.clientHeight || window.innerHeight;
    S.renderer.setSize(w, h, false);
    S.camera.aspect = w / Math.max(1, h);
    S.camera.updateProjectionMatrix();
    S.w = w; S.h = h;
  }

  function lookTargets() {
    if (S.stage === 'intro') {
      return { pos: [9.5, 3.4, 12.5], look: [0, 1.6, 0] };
    }
    if (S.stage === 'print') {
      var p = S.printP;
      var a = -0.62 + p * 0.8;
      return { pos: [Math.sin(a) * (13.2 - p * 1.6), 4.2 + p * 4.4, Math.cos(a) * (13.2 - p * 1.6)], look: [0, 1.4 + p * 0.6, 0] };
    }
    if (S.bg) return { pos: [15.5, 11.5, 19.5], look: [0, 0.8, 0] };
    return { pos: [12.5, 8.6, 15.5], look: [0, 1.4, 0] };
  }

  function frame(now) {
    S.raf = requestAnimationFrame(frame);
    if (S.paused || S.disposed) return;
    S.frameSkip = (S.frameSkip + 1) % 2;
    if (S.bg && S.frameSkip) return;
    var t = (now - S.t0) / 1000;
    var dt = S.last ? Math.min(0.06, (now - S.last) / 1000) : 0.016;
    S.last = now;

    if (S.stage === 'print' && !S.complete) {
      S.printP = Math.min(1, S.printP + dt / 4.2);
      if (S.printP >= 1) S.printP = 1;
      writeBuildings(S.printP);
      var layer = Math.round(S.printP * 118);
      if (S.onLayer) S.onLayer(layer, S.printP);
      var fx = -7.2 + S.printP * 14.4;
      if (S.gantry) {
        S.gantry.bridge.position.x = fx;
        S.gantry.head.position.y = 0.4 + Math.sin(t * 5.2) * 0.16;
        S.gantry.head.rotation.y = t * 1.5;
      }
      if (S.front) {
        S.front.position.x = fx;
        S.front.material.opacity = 0.055;
      }
      if (S.frontGround) {
        S.frontGround.position.x = fx;
        S.frontGround.material.opacity = 0.8;
      }
      S.landmarks.forEach(function (L) {
        var q = Math.max(0, Math.min(1, (S.printP - L.delay) / 0.34));
        var lq = q <= 0 ? 0.0001 : Math.floor(q * 14) / 14;
        L.group.scale.y = Math.max(0.0001, lq);
        L.topLine.position.y = L.h;
        L.topLine.material.opacity = q > 0 && q < 1 ? 0.9 : 0;
      });
      if (S.printP > 0.86) {
        var wq = Math.min(1, (S.printP - 0.86) / 0.12);
        if (S.water) S.water.material.opacity = 0.85 * wq;
        S.waves.forEach(function (w, wi) {
          w.visible = true;
          w.material.opacity = 0.10 * wq;
          var pos = w.geometry.attributes.position;
          for (var i2 = 0; i2 < pos.count; i2++) {
            pos.setY(i2, Math.sin(t * 1.1 + i2 * 0.5 + wi) * 0.025);
          }
          pos.needsUpdate = true;
        });
      }
    }

    var tg = lookTargets();
    if (!S.camPos) { S.camPos = tg.pos.slice(); S.camLook = tg.look.slice(); }
    var k = S.bg ? 0.02 : 0.045;
    S.camPos[0] += (tg.pos[0] - S.camPos[0]) * k;
    S.camPos[1] += (tg.pos[1] - S.camPos[1]) * k;
    S.camPos[2] += (tg.pos[2] - S.camPos[2]) * k;
    S.camLook[0] += (tg.look[0] - S.camLook[0]) * k;
    S.camLook[1] += (tg.look[1] - S.camLook[1]) * k;
    S.camLook[2] += (tg.look[2] - S.camLook[2]) * k;
    S.camera.position.set(S.camPos[0], S.camPos[1], S.camPos[2]);
    S.camera.lookAt(S.camLook[0], S.camLook[1], S.camLook[2]);
    if (S.bg) {
      S.world.rotation.y = Math.sin(t * 0.06) * 0.12;
    }
    S.renderer.render(S.scene, S.camera);
  }

  function mount(canvas) {
    if (S.mounted || !THREE || !window.__hasWebGL || !canvas) return null;
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch (e) { return null; }
    S.canvas = canvas;
    S.reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 900 ? 1.2 : 1.7));
    S.renderer = renderer;
    S.theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    S.scene = new THREE.Scene();
    S.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);
    S.world = new THREE.Group();
    S.scene.add(S.world);
    S.scene.add(new THREE.AmbientLight(0xffffff, 0.72));
    var dir = new THREE.DirectionalLight(0xffffff, 0.85);
    dir.position.set(6, 14, 5);
    S.scene.add(dir);
    buildGround(COL[S.theme]);
    buildCity();
    addLandmark(0.2, -0.2, buildPingAn).delay = 0.28;
    addLandmark(5.2, -1.2, buildKK100).delay = 0.55;
    addLandmark(-5.0, 1.0, buildSpringBamboo).delay = 0.2;
    addLandmark(2.2, 1.8, buildExchange).delay = 0.42;
    addLandmark(-1.8, 2.6, buildCivic).delay = 0.36;
    addLandmark(-4.8, 4.2, buildDome).delay = 0.3;
    buildGantry(COL[S.theme]);
    S.stage = 'intro';
    resize();
    S.mounted = true;
    S.t0 = performance.now();
    window.addEventListener('resize', resize, { passive: true });
    if (S.reduce) { S.renderer.render(S.scene, S.camera); return api; }
    S.raf = requestAnimationFrame(frame);
    return api;
  }

  var api = {
    mount: mount,
    play: function () {
      if (!S.mounted) return;
      S.stage = 'intro'; S.printP = 0; S.complete = false; S.bg = false;
      S.t0 = performance.now(); S.camPos = null; S.camLook = null;
      writeBuildings(0);
      S.landmarks.forEach(function (L) { L.group.scale.y = 0.0001; });
    },
    beginPrint: function () { if (!S.mounted) return; S.stage = 'print'; S.printP = 0; if (S.tops) S.tops.visible = true; },
    complete: function () {
      if (!S.mounted) return;
      S.printP = 1; S.complete = true; S.stage = 'done';
      writeBuildings(1);
      S.landmarks.forEach(function (L) { L.group.scale.y = 1; L.topLine.material.opacity = 0; });
      if (S.water) S.water.material.opacity = 0.85;
      S.waves.forEach(function (w) { w.visible = true; w.material.opacity = 0.10; });
      if (S.front) S.front.material.opacity = 0;
      if (S.frontGround) S.frontGround.material.opacity = 0;
      if (S.tops) { S.tops.count = 0; S.tops.visible = false; }
      if (S.gantry) S.gantry.group.visible = false;
      if (S.onLayer) S.onLayer(118, 1);
    },
    moveTo: function (container) {
      if (!S.mounted || !container || !S.canvas) return;
      container.appendChild(S.canvas);
      S.bg = true; S.stage = 'done';
      if (S.tops) { S.tops.count = 0; S.tops.visible = false; }
      if (S.gantry) S.gantry.group.visible = false;
      if (S.front) S.front.visible = false;
      if (S.frontGround) S.frontGround.visible = false;
      resize();
      S.camPos = null; S.camLook = null;
    },
    setTheme: function (theme) { S.theme = theme === 'light' ? 'light' : 'dark'; if (S.mounted) applyTheme(); },
    setPaused: function (p) { S.paused = p; if (!p && S.reduce) S.renderer.render(S.scene, S.camera); },
    onLayer: function (fn) { S.onLayer = fn; },
    resize: resize,
    isMounted: function () { return S.mounted; },
    hasProgress: function () { return S.printP; }
  };
  S.disposed = false;
  window.GoldenCity = api;
})();
