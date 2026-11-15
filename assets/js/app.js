/* GOLDEN — app v2: i18n, boot, rail, scroll, 3D construct hooks, interactions. */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var C = window.CONTENT || null;
  var SECTIONS = ['about', 'skills', 'works', 'ai', 'arena', 'cube', 'fab', 'life', 'contact'];
  var CUBE_STATE = {
    zh: {
      solved: '已复原 / SOLVED', scrambled: '乱序 / SCRAMBLED', scrambling: '乱序中 / SCRAMBLING',
      solving: '复原中 / SOLVING', turning: '转动 / TURNING', unavailable: '无 WebGL / NO WEBGL'
    },
    en: {
      solved: 'SOLVED', scrambled: 'SCRAMBLED', scrambling: 'SCRAMBLING',
      solving: 'SOLVING', turning: 'TURNING', unavailable: 'NO WEBGL'
    }
  };
  var state = {
    lang: 'zh', theme: 'dark', menuOpen: false, booted: false,
    skill: 0, work: 0, lenis: null, photo: 0, section: -1
  };

  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function dict() { return (C && C[state.lang]) || {}; }
  function t(path, fallback) {
    var parts = path.split('.');
    var v = dict();
    for (var i = 0; i < parts.length; i++) {
      if (v == null) return fallback != null ? fallback : '';
      v = v[parts[i]];
    }
    if (v == null || v === '') return fallback != null ? fallback : '';
    return v;
  }
  function setTexts() {
    $$('[data-t]').forEach(function (el) {
      var v = t(el.getAttribute('data-t'));
      if (v) el.textContent = v;
    });
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  /* ── per-character text reveal ────────────────────────── */
  var REVEAL_DELAY = {
    about: 520, skills: 200, works: 240, ai: 680, arena: 280,
    cube: 420, fab: 720, life: 560, contact: 220
  };
  function prepareText() {
    if (!window.GoldenText) return;
    window.GoldenText.reset(document);
    window.GoldenText.prepare(document);
  }
  function revealHero() {
    if (!window.GoldenText) return;
    window.GoldenText.revealElement($('.wordmark-solid'), 90, 34);
    window.GoldenText.revealElement($('.wordmark-hollow'), 320, 60);
    window.GoldenText.revealElement($('.hero-tagline'), 540);
  }
  function countUpStat(el) {
    if (!el || el.__counted) return;
    var node = el.firstChild;
    if (!node || node.nodeType !== 3) return;
    var text = node.nodeValue || '';
    var m = text.match(/\d+/);
    if (!m) return;
    el.__counted = true;
    var target = parseInt(m[0], 10);
    var prefix = text.slice(0, m.index);
    var suffix = text.slice(m.index + m[0].length);
    var pad = m[0].length;
    var t0 = performance.now();
    function step(now) {
      var p = Math.min(1, (now - t0) / 900);
      var e = 1 - Math.pow(1 - p, 3);
      node.nodeValue = prefix + String(Math.round(target * e)).padStart(pad, '0') + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function revealSection(sec) {
    if (!window.GoldenText || !sec) return;
    var mobile = window.innerWidth < 900;
    var h2 = sec.querySelector('.sec-head h2');
    window.GoldenText.revealElement(h2, mobile ? 90 : 180, 30);
    var base = mobile ? 140 : (REVEAL_DELAY[sec.id] != null ? REVEAL_DELAY[sec.id] : 300);
    var nodes = sec.querySelectorAll('.split:not(.is-typing)');
    var n = 0;
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i] === h2) continue;
      window.GoldenText.revealElement(nodes[i], base + n * 90);
      n++;
    }
  }
  function revealVisible() {
    if (!state.booted || !window.GoldenText) return;
    SECTIONS.forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.classList.contains('is-in')) revealSection(el);
    });
    if (window.scrollY < window.innerHeight * 0.6) revealHero();
  }

  /* ── 07 fab: printed-city cinema ──────────────────────── */
  var fabCity = null;
  var cinema = { playing: false, played: false, timers: [], status: null };

  function renderFabCinema() {
    var c = (dict().fab || {}).cinema;
    if (!c) return;
    var kicker = $('#cinema-kicker');
    if (kicker) kicker.textContent = c.kicker;
    var title = $('#cinema-title');
    if (title) title.innerHTML = c.title.map(function (t) { return '<span class="line">' + esc(t) + '</span>'; }).join('');
    var intro = $('#cinema-intro');
    if (intro) intro.innerHTML = c.intro.map(function (t) { return '<span class="ln">' + esc(t) + '</span>'; }).join('');
    var cityEl = $('#cinema-city');
    if (cityEl) {
      cityEl.innerHTML = '<span class="city-ghost" aria-hidden="true">' + esc(c.city) + '</span>' +
        '<span class="city-fill">' + esc(c.city) + '</span>' +
        '<span class="city-scan" aria-hidden="true"></span>';
    }
    var skip = $('#cinema-skip');
    if (skip) skip.textContent = c.skip;
    var layerLabel = $('#cinema-layer-label');
    if (layerLabel) layerLabel.textContent = c.layerLabel;
    var cap = $('#cinema-cap');
    if (cap) cap.textContent = c.caption;
    var replay = $('#fab-replay');
    if (replay) replay.textContent = c.replay;
    var status = $('#cinema-status');
    if (status) status.textContent = c.status[0];
    cinema.status = c.status;
  }

  function updateCinemaLayer(layer, p) {
    var n = $('#cinema-layer');
    if (n) n.textContent = pad3(layer);
    if (cinema.status) {
      var st = p < 0.84 ? cinema.status[0] : (p < 0.97 ? cinema.status[1] : cinema.status[2]);
      var el = $('#cinema-status');
      if (el) el.textContent = st;
    }
  }

  function pad3(n) { return String(Math.max(0, Math.round(n))).padStart(3, '0'); }

  function markFabDone(active) {
    var fab = document.getElementById('fab');
    if (fab && active) fab.classList.add('cinema-done');
    var ov = $('#fab-cinema');
    if (ov) { ov.hidden = true; ov.classList.remove('is-on', 'is-out'); }
    var r = $('#fab-replay');
    if (r) {
      var can = active && !!(window.__hasWebGL && window.GoldenCity && window.innerWidth >= 900 && !reduce);
      r.style.display = can ? '' : 'none';
    }
  }

  function clearCinemaTimers() {
    cinema.timers.forEach(function (t) { clearTimeout(t); });
    cinema.timers = [];
  }

  function finishFabCinema() {
    if (!cinema.playing) return;
    clearCinemaTimers();
    var overlay = $('#fab-cinema');
    var fab = document.getElementById('fab');
    if (fabCity) {
      fabCity.complete();
      fabCity.moveTo($('#fab-city-bg'));
    }
    markFabDone(true);
    if (specimens.fab) specimens.fab.pause();
    if (overlay) {
      overlay.classList.add('is-out');
      overlay.classList.remove('is-on', 'is-title', 'is-intro', 'is-printing', 'is-shenzhen');
    }
    if (fab) {
      if (window.GoldenText) window.GoldenText.reset(fab);
      fab.classList.remove('is-in');
      void fab.offsetWidth;
      setTimeout(function () { fab.classList.add('is-in'); revealSection(fab); }, 140);
    }
    document.documentElement.classList.remove('is-cinema');
    if (state.lenis) state.lenis.start();
    if (fab) {
      var off = Math.round(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-h')) || 64) + 8;
      var targetY = Math.max(0, fab.offsetTop - off);
      if (state.lenis) state.lenis.scrollTo(targetY, { immediate: true, force: true });
      else window.scrollTo(0, targetY);
    }
    cinema.playing = false;
    setTimeout(function () { if (overlay) overlay.hidden = true; }, 560);
  }

  function startFabCinema(replay) {
    if (cinema.playing) return;
    if (location.search.indexOf('nocine') >= 0) { markFabDone(false); return; }
    if (!window.GoldenCity || reduce || window.innerWidth < 900 || !window.__hasWebGL) {
      markFabDone(false);
      return;
    }
    cinema.playing = true;
    cinema.played = true;
    var overlay = $('#fab-cinema');
    if (!overlay) { markFabDone(false); return; }
    var fab = document.getElementById('fab');
    if (fab) fab.classList.remove('cinema-done');
    if (!fabCity) fabCity = window.GoldenCity.mount($('#city-canvas'));
    if (!fabCity) { markFabDone(false); cinema.playing = false; return; }
    overlay.hidden = false;
    overlay.classList.remove('is-out', 'is-open', 'is-title', 'is-intro', 'is-printing', 'is-shenzhen', 'is-on');
    overlay.appendChild($('#city-canvas'));
    if (fabCity.resize) fabCity.resize();
    void overlay.offsetWidth;
    overlay.classList.add('is-on');
    document.documentElement.classList.add('is-cinema');
    if (state.lenis) state.lenis.stop();
    fabCity.onLayer(updateCinemaLayer);
    fabCity.setTheme(state.theme);
    fabCity.setPaused(false);
    fabCity.play();
    clearCinemaTimers();
    cinema.timers.push(setTimeout(function () { overlay.classList.add('is-open'); }, 360));
    cinema.timers.push(setTimeout(function () { overlay.classList.add('is-title'); }, 780));
    cinema.timers.push(setTimeout(function () { overlay.classList.add('is-intro'); }, 1180));
    cinema.timers.push(setTimeout(function () {
      overlay.classList.add('is-printing');
      fabCity.beginPrint();
    }, 2200));
    cinema.timers.push(setTimeout(function () {
      overlay.classList.add('is-shenzhen');
      fabCity.complete();
    }, 6450));
    cinema.timers.push(setTimeout(function () { overlay.classList.add('is-out'); }, 8900));
    cinema.timers.push(setTimeout(finishFabCinema, 9500));
  }

  function setupFabCinema() {
    if (location.search.indexOf('nocine') >= 0) { markFabDone(false); return; }
    var skip = $('#cinema-skip');
    if (skip) skip.addEventListener('click', function () { if (cinema.playing) finishFabCinema(); });
    var replay = $('#fab-replay');
    if (replay) replay.addEventListener('click', function () {
      startFabCinema(true);
      window.scrollTo({ top: document.getElementById('fab').offsetTop - 60, behavior: 'auto' });
    });
    var fab = document.getElementById('fab');
    if (!fab) return;
    if (!window.__hasWebGL || reduce || window.innerWidth < 900) { markFabDone(false); return; }
    if (!('IntersectionObserver' in window)) { return; }
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && !cinema.played) {
        startFabCinema(false);
        io.disconnect();
      }
    }, { threshold: 0.66 });
    io.observe(fab);
    var bgIo = new IntersectionObserver(function (entries) {
      if (fabCity && fabCity.isMounted()) fabCity.setPaused(!entries[0].isIntersecting);
    }, { rootMargin: '120px' });
    var bg = $('#fab-city-bg');
    if (bg) bgIo.observe(bg);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && cinema.playing) finishFabCinema();
    });
  }

  /* ── theme / language ─────────────────────────────────── */
  function applyTheme(theme, persist) {
    state.theme = theme;
    root.dataset.theme = theme;
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#F4F4F2' : '#141414');
    var word = theme === 'light' ? 'LIGHT' : 'DARK';
    var lbl = $('#theme-label');
    if (lbl) lbl.textContent = word;
    $$('[data-foot-theme], [data-menu-theme]').forEach(function (el) { el.textContent = word; });
    if (window.GoldenHero) window.GoldenHero.setTheme(theme);
    if (window.GoldenBoot) window.GoldenBoot.setTheme(theme === 'dark');
    if (window.GoldenConstruct) window.GoldenConstruct.setTheme(theme);
    if (specimens.skills) specimens.skills.setTheme(theme);
    if (specimens.works) specimens.works.setTheme(theme);
    if (specimens.fab) specimens.fab.setTheme(theme);
    if (fabCity) fabCity.setTheme(theme);
    syncArch();
    if (persist) { try { localStorage.setItem('golden-theme', theme); } catch (e) {} }
  }
  function withTransition(fn) {
    if (!reduce && document.startViewTransition) {
      try { document.startViewTransition(fn); return; } catch (e) {}
    }
    fn();
  }
  function negateTheme() {
    withTransition(function () { applyTheme(state.theme === 'dark' ? 'light' : 'dark', true); });
  }
  function applyLang(lang, persist) {
    state.lang = lang === 'en' ? 'en' : 'zh';
    root.lang = state.lang === 'en' ? 'en' : 'zh-CN';
    document.title = t('meta.title', 'GOLDEN');
    var md = $('meta[name="description"]');
    if (md) md.setAttribute('content', t('meta.description', ''));
    var lk = $('#lang-key'); var lv = $('#lang-val');
    if (lk) lk.textContent = state.lang === 'en' ? 'EN' : '中';
    if (lv) lv.textContent = state.lang === 'en' ? '中' : 'EN';
    if ($('#lang-toggle')) $('#lang-toggle').setAttribute('aria-label', state.lang === 'en' ? '切换为中文' : 'Switch to English');
    setTexts();
    renderNav();
    renderRail();
    renderHero();
    renderAbout();
    renderSkills();
    renderWorks();
    renderModel();
    renderArena();
    renderCube();
    renderFab();
    renderLife();
    renderContact();
    renderFooter();
    renderKinetic();
    renderFabCinema();
    syncArch();
    prepareText();
    if (state.booted) setTimeout(revealVisible, 60);
    if (persist) { try { localStorage.setItem('golden-lang', state.lang); } catch (e) {} }
    applyTheme(state.theme, false);
  }

  /* ── nav + rail ───────────────────────────────────────── */
  function renderNav() {
    $('#nav').innerHTML = SECTIONS.map(function (id, i) {
      return '<a href="#' + id + '" data-nav="' + id + '"><span class="n">' + pad2(i + 1) +
        '</span><span class="lbl">' + esc(t('nav.' + id)) + '</span></a>';
    }).join('');
    $('#menu-nav').innerHTML = SECTIONS.map(function (id, i) {
      return '<a href="#' + id + '" data-nav="' + id + '"><span class="n">' + pad2(i + 1) +
        '</span><span class="zh">' + esc(t('nav.' + id)) + '</span></a>';
    }).join('');
    bindAnchors($('#nav'));
    bindAnchors($('#menu-nav'));
    var mt = $('#menu-toggle');
    if (mt) mt.setAttribute('aria-label', t('ui.menu', 'Menu'));
  }
  function renderRail() {
    var rail = $('#rail');
    if (!rail) return;
    rail.innerHTML = SECTIONS.map(function (id, i) {
      return '<a href="#' + id + '" data-rail="' + id + '">' +
        '<span class="rail-label"><b>' + pad2(i + 1) + '</b>' + esc(t('nav.' + id)) + '</span>' +
        '<i></i></a>';
    }).join('');
    bindAnchors(rail);
  }

  /* ── hero ─────────────────────────────────────────────── */
  var scrambleRAF = 0;
  function scrambleText(el, dur) {
    if (!el || reduce) return;
    var finalText = el.getAttribute('data-scr') || el.textContent;
    el.setAttribute('data-scr', finalText);
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#+-';
    var start = 0;
    cancelAnimationFrame(scrambleRAF);
    function tick(now) {
      if (!start) start = now;
      var p = Math.min(1, (now - start) / (dur || 420));
      var out = '';
      for (var i = 0; i < finalText.length; i++) {
        var ch = finalText[i];
        if (ch === ' ' || ch === '.') { out += ch; continue; }
        out += p * finalText.length - i * 0.75 > 0 ? ch : chars[(Math.random() * chars.length) | 0];
      }
      el.textContent = out;
      if (p < 1) scrambleRAF = requestAnimationFrame(tick);
      else el.textContent = finalText;
    }
    scrambleRAF = requestAnimationFrame(tick);
  }
  function renderHero() {
    var h = dict().hero || {};
    var solid = $('[data-hero-word-solid]');
    var hollow = $('[data-hero-word-hollow]');
    if (solid) solid.textContent = h.titleEn || 'GOLDEN';
    if (hollow) hollow.textContent = h.titleZh || '金灿灿';
    if (solid) solid.removeAttribute('data-scr');
    if (hollow) hollow.removeAttribute('data-scr');
    cancelAnimationFrame(scrambleRAF);
    var tagline = $('.hero-tagline');
    if (tagline) tagline.textContent = h.tagline || '';
  }

  /* ── about ─────────────────────────────────────────────── */
  function renderAbout() {
    var a = dict().about || {};
    var stats = $('#about .stats');
    if (stats) {
      stats.innerHTML = (a.stats || []).map(function (s) {
        return '<li><span class="stat-value">' + esc(s.value) +
          (s.unit ? '<small>' + esc(s.unit) + '</small>' : '') +
          '</span><span class="stat-label">' + esc(s.label) + '</span></li>';
      }).join('');
    }
    var creed = $('#creed');
    if (creed) {
      creed.innerHTML = (a.creed || []).map(function (c) {
        var primary = state.lang === 'zh' ? c.zh : c.en;
        var secondary = state.lang === 'zh' ? c.en : c.zh;
        return '<li><span class="cr-no">' + esc(c.no) + '</span>' +
          '<span class="cr-zh">' + esc(primary) + '</span>' +
          '<span class="cr-en">' + esc(secondary) + '</span></li>';
      }).join('');
    }
  }

  /* ── skills ────────────────────────────────────────────── */
  function skillArt(i) {
    var art = [
      '<svg viewBox="0 0 300 120" fill="none" stroke="currentColor" stroke-width="1">' +
        '<g transform="translate(20 12)">' +
        '<rect x="0" y="0" width="140" height="24"/><path d="M8 12 L16 5 M8 12 L16 19" /><path d="M26 12 L64 12"/>' +
        '<rect x="0" y="32" width="180" height="24" opacity=".7"/><path d="M8 44 L16 37 M8 44 L16 51" opacity=".7"/><path d="M26 44 L92 44" opacity=".7"/>' +
        '<rect x="0" y="64" width="110" height="24" opacity=".45"/><path d="M8 76 L16 69 M8 76 L16 83" opacity=".45"/><path d="M26 76 L56 76" opacity=".45"/>' +
        '<path d="M196 8 L196 104 M212 8 L212 104 M228 8 L228 104 M244 8 L244 104 M260 8 L260 104" opacity=".25"/>' +
        '<rect x="188" y="40" width="80" height="32" stroke-dasharray="3 4"/>' +
        '</g></svg>',
      '<svg viewBox="0 0 300 120" fill="none" stroke="currentColor" stroke-width="1">' +
        '<g transform="translate(150 60)">' +
        '<path d="M0 -44 L38 -22 L38 22 L0 44 L-38 22 L-38 -22 Z"/>' +
        '<path d="M0 -44 L0 0 L38 22 M0 0 L-38 22 M0 0 L0 44" opacity=".6"/>' +
        '<path d="M-96 0 L-44 0 M44 0 L96 0" stroke-dasharray="4 5" opacity=".5"/>' +
        '<rect x="-112" y="-8" width="16" height="16" stroke-dasharray="2 3"/>' +
        '<rect x="96" y="-8" width="16" height="16"/>' +
        '</g></svg>',
      '<svg viewBox="0 0 300 120" fill="none" stroke="currentColor" stroke-width="1">' +
        '<g transform="translate(150 60)">' +
        '<circle cx="-92" cy="-26" r="5"/><circle cx="-92" cy="26" r="5"/>' +
        '<circle cx="-40" cy="-38" r="5"/><circle cx="-40" cy="0" r="5"/><circle cx="-40" cy="38" r="5"/>' +
        '<circle cx="14" cy="-24" r="5"/><circle cx="14" cy="24" r="5"/>' +
        '<circle cx="68" cy="-10" r="5"/><circle cx="68" cy="14" r="5"/>' +
        '<path d="M-87 -23 L-45 -36 M-87 -23 L-45 -1 M-87 23 L-45 1 M-87 23 L-45 36 M-35 -36 L9 -23 M-35 0 L9 -23 M-35 0 L9 23 M-35 38 L9 23 M19 -20 L63 -9 M19 20 L63 11 M19 -20 L63 11 M19 20 L63 -9" opacity=".45"/>' +
        '<rect x="-118" y="-52" width="236" height="104" stroke-dasharray="3 5" opacity=".25"/>' +
        '</g></svg>',
      '<svg viewBox="0 0 300 120" fill="none" stroke="currentColor" stroke-width="1">' +
        '<g transform="translate(150 60)">' +
        '<path d="M0 -40 L36 -20 L36 20 L0 40 L-36 20 L-36 -20 Z"/>' +
        '<path d="M-36 -20 L0 0 L36 -20 M0 0 L0 40"/>' +
        '<path d="M0 -40 L0 0 M-18 -30 L18 -10 M-18 -10 L18 -30" opacity=".5"/>' +
        '<path d="M-36 -20 L36 -20" stroke-dasharray="2 4" opacity=".5"/>' +
        '<path d="M-52 26 L-52 -8 M52 26 L52 -8" opacity=".3"/>' +
        '</g></svg>'
    ];
    return art[i] || art[0];
  }
  function renderSkills() {
    var g = (dict().skills && dict().skills.groups) || [];
    var rows = $('#skill-rows');
    if (!rows) return;
    rows.innerHTML = g.map(function (x, i) {
      return '<li><button class="skill-row' + (i === state.skill ? ' is-current' : '') + '" type="button" data-skill="' + i + '" aria-pressed="' + (i === state.skill) + '">' +
        '<span class="r-no">' + esc(x.no) + '</span>' +
        '<span class="r-names"><span class="r-en">' + esc(x.en) + '</span><span class="r-zh">' + esc(x.zh) + '</span></span>' +
        '<span class="r-count">' + pad2(x.items.length) + '</span>' +
        '</button></li>';
    }).join('');
    $$('#skill-rows .skill-row').forEach(function (btn) {
      var i = +btn.dataset.skill;
      btn.addEventListener('pointerenter', function () { setSkill(i, true); });
      btn.addEventListener('focus', function () { setSkill(i, true); });
      btn.addEventListener('click', function () { setSkill(i, true); });
    });
    setSkill(state.skill, false);
  }
  function setSkill(i, user) {
    var g = (dict().skills && dict().skills.groups) || [];
    if (!g[i]) i = 0;
    state.skill = i;
    var group = g[i];
    $$('#skill-rows .skill-row').forEach(function (btn, k) {
      var on = k === i;
      btn.classList.toggle('is-current', on);
      btn.setAttribute('aria-pressed', on);
    });
    $('#skill-no').textContent = group.no;
    $('#skill-en').textContent = group.en;
    $('#skill-zh').textContent = group.zh;
    $('#skill-items').innerHTML = group.items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    $('#skill-art').innerHTML = skillArt(i);
    var sc = $('#skill-count');
    if (sc) sc.textContent = pad2(i + 1) + ' / ' + pad2(g.length);
    if (specimens.skills) specimens.skills.setVariant(i);
    if (user && !reduce) {
      var panel = $('#skill-panel');
      panel.classList.remove('is-swap');
      void panel.offsetWidth;
      panel.classList.add('is-swap');
    }
  }

  /* ── works ─────────────────────────────────────────────── */
  function workArt(i) {
    var art = [
      '<svg viewBox="0 0 280 190" fill="none" stroke="currentColor" stroke-width="1.2">' +
        '<g transform="translate(140 100)" class="draw">' +
        '<path d="M0 -60 L56 -30 L56 26 L0 56 L-56 26 L-56 -30 Z" class="draw"/>' +
        '<path d="M-56 -30 L0 0 L56 -30 M0 0 L0 56" class="draw" opacity=".55"/>' +
        '<path d="M-40 -22 L-10 -6 L-10 28 L-40 12 Z" class="draw"/>' +
        '<path d="M10 -6 L40 -22 M10 12 L40 -4 M10 30 L40 14" class="draw" opacity=".6"/>' +
        '<path d="M-30 -46 L30 -46" class="draw" stroke-dasharray="4 5" opacity=".5"/>' +
        '</g><text x="12" y="182" font-family="Saira,sans-serif" font-size="9" letter-spacing="2" stroke="none" fill="currentColor">FRAME / 01</text></svg>',
      '<svg viewBox="0 0 280 190" fill="none" stroke="currentColor" stroke-width="1.2">' +
        '<g class="draw">' +
        '<circle cx="48" cy="96" r="7" class="draw"/><circle cx="120" cy="52" r="7" class="draw"/><circle cx="120" cy="138" r="7" class="draw"/>' +
        '<circle cx="196" cy="96" r="7" class="draw"/><circle cx="232" cy="52" r="4" class="draw"/><circle cx="232" cy="140" r="4" class="draw"/>' +
        '<path d="M55 94 L112 55 M55 98 L112 135 M127 54 L188 93 M127 136 L188 99 M203 92 L228 56 M203 100 L228 136" class="draw" opacity=".55"/>' +
        '<rect x="24" y="30" width="232" height="130" class="draw" stroke-dasharray="3 6" opacity=".28"/>' +
        '</g><text x="12" y="182" font-family="Saira,sans-serif" font-size="9" letter-spacing="2" stroke="none" fill="currentColor">AGENTS / 02</text></svg>',
      '<svg viewBox="0 0 280 190" fill="none" stroke="currentColor" stroke-width="1.2">' +
        '<g class="draw">' +
        '<rect x="30" y="34" width="220" height="118" class="draw"/>' +
        '<path d="M30 60 L250 60 M30 86 L250 86 M30 112 L250 112" class="draw" opacity=".2"/>' +
        '<path d="M44 128 L74 106 L96 116 L116 84 L138 100 L160 72 L182 96 L206 76 L236 94" class="draw"/>' +
        '<path d="M44 140 L84 140 M44 48 L100 48" class="draw" opacity=".35"/>' +
        '<path d="M120 152 L120 166 M96 166 L144 166" class="draw" opacity=".5"/>' +
        '</g><text x="12" y="182" font-family="Saira,sans-serif" font-size="9" letter-spacing="2" stroke="none" fill="currentColor">METRICS / 03</text></svg>',
      '<svg viewBox="0 0 280 190" fill="none" stroke="currentColor" stroke-width="1.2">' +
        '<g class="draw">' +
        (function () {
          var out = '', r, c;
          for (r = 0; r < 6; r++) {
            for (c = 0; c < 8; c++) {
              var x = 44 + c * 24, y = 48 + r * 16 - c * 4;
              var hi = (r === 2 && c > 2) || (r === 4 && c === 5);
              out += '<rect x="' + x + '" y="' + y + '" width="' + (hi ? 12 : 7) + '" height="' + (hi ? 12 : 7) + '" opacity="' + (hi ? '.95' : '.45') + '"/>';
            }
          }
          return out;
        })() +
        '<path d="M40 170 L216 170" stroke-dasharray="2 5" opacity=".4"/>' +
        '<text x="40" y="164" font-family="Saira,sans-serif" font-size="8" letter-spacing="1.5" stroke="none" fill="currentColor" opacity=".7">0 → 1B</text>' +
        '</g><text x="12" y="186" font-family="Saira,sans-serif" font-size="9" letter-spacing="2" stroke="none" fill="currentColor">PARAMS / 04</text></svg>'
    ];
    return art[i] || art[0];
  }
  function renderWorks() {
    var items = (dict().works && dict().works.items) || [];
    var rows = $('#work-rows');
    if (!rows) return;
    rows.innerHTML = items.map(function (w, i) {
      return '<li><button class="work-row' + (i === state.work ? ' is-current' : '') + '" type="button" data-work="' + i + '" aria-pressed="' + (i === state.work) + '">' +
        '<span class="w-no">' + esc(w.no) + '</span>' +
        '<span class="w-name"><span class="w-en">' + esc(w.en) + '</span><span class="w-zh">' + esc(w.zh) + '</span></span>' +
        '<span class="w-year">' + esc(w.year) + '</span>' +
        '<span class="w-mark" aria-hidden="true"></span>' +
        '</button></li>';
    }).join('');
    $$('#work-rows .work-row').forEach(function (btn) {
      var i = +btn.dataset.work;
      btn.addEventListener('pointerenter', function () { setWork(i, false); });
      btn.addEventListener('focus', function () { setWork(i, false); });
      btn.addEventListener('click', function () { setWork(i, true); });
    });
    setWork(state.work, false);
  }
  function setWork(i, user) {
    var items = (dict().works && dict().works.items) || [];
    if (!items[i]) i = 0;
    state.work = i;
    var w = items[i];
    $$('#work-rows .work-row').forEach(function (btn, k) {
      var on = k === i;
      btn.classList.toggle('is-current', on);
      btn.setAttribute('aria-pressed', on);
    });
    $('#work-no').textContent = w.no;
    $('#work-en').textContent = w.en;
    $('#work-zh').textContent = w.zh;
    $('#work-desc').textContent = w.desc;
    $('#work-tags').innerHTML = w.tags.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    $('#work-role').textContent = w.role;
    $('#work-art').innerHTML = workArt(i);
    var wc = $('#work-count');
    if (wc) wc.textContent = pad2(i + 1) + ' / ' + pad2(items.length);
    if (specimens.works) specimens.works.setVariant(i);
    var detail = $('#work-detail');
    if (!reduce) {
      detail.classList.remove('is-swap', 'is-in');
      void detail.offsetWidth;
      detail.classList.add('is-swap');
    }
    detail.classList.add('is-in');
  }

  /* ── model / architecture ──────────────────────────────── */
  var archApi = null;
  function syncArch() {
    if (!archApi) return;
    try {
      if (archApi.setLang) archApi.setLang(state.lang);
      if (archApi.setTheme) archApi.setTheme(state.theme);
    } catch (e) {}
  }
  function ensureArch() {
    if (archApi || !window.GoldenArch) return;
    var el = $('#arch-root');
    if (!el) return;
    try {
      archApi = window.GoldenArch.mount(el, { lang: state.lang, theme: state.theme, reduce: reduce });
    } catch (e) { archApi = null; }
  }
  var specimens = { skills: null, works: null, fab: null };
  function mountSpecimens() {
    if (!window.GoldenSpecimen) return;
    $$('.specimen-canvas[data-specimen]').forEach(function (cv) {
      var kind = cv.getAttribute('data-specimen');
      if (specimens[kind]) return;
      var api = window.GoldenSpecimen.mount(cv, kind, { theme: state.theme });
      if (!api) return;
      specimens[kind] = api;
      var wrap = cv.closest('.skill-stage, .work-stage, .fab-art');
      if (wrap) wrap.classList.add('has-specimen');
    });
    if (specimens.skills) specimens.skills.setVariant(state.skill);
    if (specimens.works) specimens.works.setVariant(state.work);
    if (specimens.fab) specimens.fab.setVariant(0);
  }

  function renderKinetic() {
    var track = $('#kinetic-track');
    if (!track) return;
    var words = state.lang === 'zh'
      ? ['令牌', '注意力', '采样', '训练', '推理', '迭代', '魔方', '手作']
      : ['TOKEN', 'ATTENTION', 'SAMPLE', 'TRAIN', 'INFER', 'ITERATE', 'CUBE', 'MAKE'];
    var out = '';
    for (var r = 0; r < 2; r++) {
      words.forEach(function (w, i) {
        var cls = i === 2 ? ' is-signal' : (i === 5 ? ' is-solid' : '');
        out += '<span class="kinetic-word' + cls + '">' + esc(w) + '</span>';
        out += '<span class="kinetic-sep" aria-hidden="true">◆</span>';
      });
    }
    track.innerHTML = out;
  }

  function renderModel() {
    var a = dict().ai || {};
    var fields = $('#ai .model-fields');
    if (fields) {
      fields.innerHTML = (a.fields || []).map(function (f) {
        return '<li><span class="mf-k">' + esc(f.k) + '</span><span class="mf-v">' + esc(f.v) + '</span></li>';
      }).join('');
    }
  }

  /* ── arena ─────────────────────────────────────────────── */
  function renderArena() {
    var a = dict().arena || {};
    var ev = a.event || {};
    var en = $('#arena-en');
    if (en) en.textContent = 'EVENT / ' + (ev.no || '01');
    var title = $('#arena-title');
    if (title) title.textContent = ev.title || 'PAYATHON2026';
    var st = $('#arena-state');
    if (st) st.textContent = ev.status || '';
    var note = $('#arena-note');
    if (note) note.textContent = ev.note || '';
    var tracks = $('#arena-tracks');
    if (tracks) tracks.innerHTML = (ev.tracks || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    var rm = $('#roadmap');
    if (rm) {
      rm.innerHTML = (a.roadmap || []).map(function (it) {
        return '<li><span class="r-no">' + esc(it.no) + '</span>' +
          '<span class="r-title"><span class="r-en">' + esc(it.en) + '</span>' +
          '<span class="r-zh">' + esc(it.zh) + '</span></span>' +
          '<span class="r-state">' + esc(it.state) + '</span></li>';
      }).join('');
    }
  }

  /* ── cube ──────────────────────────────────────────────── */
  function paintCubeState(name) {
    var el = $('[data-cube-state]');
    if (!el || !name) return;
    var text = (CUBE_STATE[state.lang] || CUBE_STATE.en)[name] || '';
    if (text) el.textContent = text;
  }
  function renderCube() {
    var c = dict().cube || {};
    var stats = $('#cube .cube-stats');
    if (stats) {
      stats.innerHTML = (c.stats || []).map(function (s) {
        return '<li><span class="stat-value">' + esc(s.v) + '</span><span class="stat-label">' + esc(s.k) + '</span></li>';
      }).join('');
    }
    var cf = $('.cube-fallback');
    if (cf && $('#cube-root') && $('#cube-root').classList.contains('no-webgl')) {
      cf.textContent = state.lang === 'en' ? '3D needs WebGL' : '3D 需要 WebGL';
    }
    if (window.__cubeApi && window.__cubeApi.state) paintCubeState(window.__cubeApi.state());
  }

  /* ── fab ───────────────────────────────────────────────── */
  function renderFab() {
    var f = dict().fab || {};
    var stages = $('#fab-stages');
    if (stages) {
      stages.innerHTML = (f.stages || []).map(function (s) {
        return '<li class="fab-stage"><span class="f-no">' + esc(s.no) + '</span>' +
          '<span class="f-en">' + esc(s.en) + '</span>' +
          '<span class="f-zh">' + esc(s.zh) + '</span>' +
          '<span class="f-desc">' + esc(s.desc) + '</span></li>';
      }).join('');
    }
  }

  /* ── life ──────────────────────────────────────────────── */
  var puzzle = { board: [], moves: 0, solved: true, started: false };
  function lifePhotos() { return (dict().life || {}).photos || []; }
  function renderLife() {
    var l = dict().life || {};
    var blocks = $('#life-blocks');
    if (blocks) {
      blocks.innerHTML = (l.blocks || []).map(function (b) {
        return '<li class="life-block"><span class="lb-no">' + esc(b.no) + '</span>' +
          '<span class="lb-main"><span class="lb-en">' + esc(b.en) + '</span>' +
          '<span class="lb-zh">' + esc(b.zh) + '</span>' +
          '<span class="lb-desc">' + esc(b.desc) + '</span></span></li>';
      }).join('');
    }
    renderGallery();
    renderPuzzleLabels();
  }
  var cf = { index: 0, photos: 0, timer: 0, drag: false, startX: 0, moved: 0, over: false };

  function coverflowOffset(i) {
    var n = cf.photos;
    if (!n) return 0;
    var d = ((i - cf.index) % n + n) % n;
    if (d > n / 2) d -= n;
    return d;
  }

  function applyCoverflow() {
    var stage = $('#coverflow-stage');
    if (!stage) return;
    var figures = $$('#coverflow-stage figure');
    var step = Math.min(190, Math.max(96, stage.clientWidth * 0.15));
    figures.forEach(function (fig, i) {
      var d = coverflowOffset(i);
      var ad = Math.abs(d);
      var x = d * step;
      var z = -ad * 190;
      var ry = -d * 34;
      var sc = Math.max(0.62, 1 - ad * 0.1);
      fig.style.transform = 'translate(-50%,-50%) translate3d(' + x.toFixed(1) + 'px,' + (ad * 12).toFixed(1) + 'px,' + z.toFixed(1) + 'px) rotateY(' + ry.toFixed(1) + 'deg) scale(' + sc.toFixed(3) + ')';
      fig.style.opacity = ad > 2.2 ? '0' : '1';
      fig.style.zIndex = String(20 - Math.round(ad * 3));
      fig.classList.toggle('is-active', i === cf.index);
    });
  }

  function updateCoverflowLabels() {
    var photos = lifePhotos();
    var p = photos[cf.index];
    if (!p) return;
    var cap = $('#cf-caption');
    if (cap) cap.textContent = state.lang === 'zh' ? p.captionZh : p.captionEn;
    var idx = $('#cf-index');
    if (idx) idx.textContent = pad2(cf.index + 1) + ' / ' + pad2(photos.length);
    $$('#coverflow-stage figure').forEach(function (fig, i) {
      fig.setAttribute('aria-current', i === cf.index ? 'true' : 'false');
    });
    var live = $('#cf-caption');
    if (live) live.setAttribute('data-live', '1');
  }

  function coverflowGo(next) {
    var n = lifePhotos().length;
    if (!n) return;
    cf.index = ((next % n) + n) % n;
    applyCoverflow();
    updateCoverflowLabels();
  }

  function startCoverflowAuto() {
    if (cf.timer) clearInterval(cf.timer);
    cf.timer = 0;
    if (reduce) return;
    cf.timer = setInterval(function () {
      if (document.hidden || cf.over || cf.drag) return;
      var life = document.getElementById('life');
      if (!life || !life.classList.contains('is-in')) return;
      var box = $('#coverflow');
      if (!box) return;
      var r = box.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      coverflowGo(cf.index + 1);
    }, reduce ? 99999 : 4600);
  }

  function renderGallery() {
    var stage = $('#coverflow-stage');
    if (!stage) return;
    var photos = lifePhotos();
    cf.photos = photos.length;
    if (cf.index >= photos.length) cf.index = 0;
    stage.innerHTML = photos.map(function (p, i) {
      var cap = state.lang === 'zh' ? p.captionZh : p.captionEn;
      return '<figure data-photo="' + i + '" tabindex="-1">' +
        '<button type="button" aria-label="' + esc(p.alt) + '" style="display:block;width:100%;border:0;padding:0;background:none;cursor:pointer">' +
        '<img src="' + esc(p.src) + '" alt="' + esc(p.alt) + '" width="900" height="1125" loading="lazy" />' +
        '</button>' +
        '<figcaption><span>' + pad2(i + 1) + '</span><b>' + esc(cap) + '</b></figcaption></figure>';
    }).join('');
    $$('#coverflow-stage figure').forEach(function (fig, i) {
      fig.addEventListener('click', function () {
        if (cf.moved > 8) return;
        if (i === cf.index) openLightbox(i);
        else coverflowGo(i);
      });
      fig.addEventListener('pointerenter', function () { cf.over = true; });
      fig.addEventListener('pointerleave', function () { cf.over = false; });
    });
    applyCoverflow();
    updateCoverflowLabels();
    startCoverflowAuto();
  }

  function setupCoverflow() {
    var box = $('#coverflow');
    var stage = $('#coverflow-stage');
    if (!box || !stage) return;
    $$('[data-cf]', box).forEach(function (btn) {
      btn.addEventListener('click', function () {
        coverflowGo(cf.index + (btn.dataset.cf === 'next' ? 1 : -1));
      });
    });
    box.addEventListener('pointerenter', function () { cf.over = true; });
    box.addEventListener('pointerleave', function () { cf.over = false; });
    var captured = false;
    stage.addEventListener('pointerdown', function (e) {
      cf.drag = true; cf.moved = 0; cf.startX = e.clientX; captured = false;
      stage.classList.add('is-drag');
    });
    stage.addEventListener('pointermove', function (e) {
      if (!cf.drag) return;
      cf.moved = Math.max(cf.moved, Math.abs(e.clientX - cf.startX));
      if (!captured && cf.moved > 10) {
        captured = true;
        try { stage.setPointerCapture(e.pointerId); } catch (err) {}
      }
    });
    function endDrag(e) {
      if (!cf.drag) return;
      cf.drag = false;
      stage.classList.remove('is-drag');
      var dx = e.clientX - cf.startX;
      if (Math.abs(dx) > 42) coverflowGo(cf.index + (dx < 0 ? 1 : -1));
      setTimeout(function () { cf.moved = 0; }, 30);
    }
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
    stage.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { coverflowGo(cf.index + 1); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { coverflowGo(cf.index - 1); e.preventDefault(); }
    });
  }

  function openLightbox(i) {
    var photos = lifePhotos();
    if (!photos.length) return;
    state.photo = ((i % photos.length) + photos.length) % photos.length;
    var box = $('#lightbox');
    if (!box) return;
    box.hidden = false;
    document.body.classList.add('is-locked');
    if (state.lenis) state.lenis.stop();
    paintLightbox();
    var btn = $('#lightbox-close');
    if (btn) btn.focus({ preventScroll: true });
  }
  function paintLightbox() {
    var photos = lifePhotos();
    var p = photos[state.photo];
    if (!p) return;
    var img = $('#lightbox-img');
    if (img) { img.src = p.src; img.alt = p.alt; }
    var cap = $('#lightbox-cap');
    if (cap) cap.textContent = state.lang === 'zh' ? p.captionZh : p.captionEn;
    var idx = $('#lightbox-index');
    if (idx) idx.textContent = pad2(state.photo + 1) + ' / ' + pad2(photos.length);
  }
  function closeLightbox() {
    var box = $('#lightbox');
    if (!box || box.hidden) return;
    box.hidden = true;
    document.body.classList.remove('is-locked');
    if (state.lenis) state.lenis.start();
  }
  function navLightbox(dir) {
    var photos = lifePhotos();
    if (!photos.length) return;
    state.photo = (state.photo + dir + photos.length) % photos.length;
    paintLightbox();
  }
  function puzzleSolvedBoard() {
    var b = [];
    for (var i = 1; i < 16; i++) b.push(i);
    b.push(0);
    return b;
  }
  function puzzleIsSolved() {
    var s = puzzleSolvedBoard();
    for (var i = 0; i < 16; i++) if (puzzle.board[i] !== s[i]) return false;
    return true;
  }
  function puzzleEmpty() { return puzzle.board.indexOf(0); }
  function puzzleCanMove(i) {
    var e = puzzleEmpty();
    if (i === e) return false;
    var sameRow = Math.floor(i / 4) === Math.floor(e / 4) && Math.abs(i - e) === 1;
    return sameRow || Math.abs(i - e) === 4;
  }
  function puzzleRender() {
    var grid = $('#puzzle-grid');
    if (!grid) return;
    grid.innerHTML = puzzle.board.map(function (v, i) {
      var empty = v === 0;
      return '<button class="puzzle-tile' + (empty ? ' is-empty' : '') + '" type="button" data-idx="' + i + '"' +
        (empty ? ' tabindex="-1" aria-hidden="true"' : '') + '>' + (empty ? '' : v) + '</button>';
    }).join('');
    var wrap = $('#puzzle');
    if (wrap) wrap.classList.toggle('is-solved', puzzle.solved);
    var mv = $('#puzzle-moves');
    if (mv) mv.textContent = puzzle.moves;
    var st = $('#puzzle-state');
    if (st) st.textContent = puzzle.solved && puzzle.moves > 0 ? t('life.puzzle.solved') : '';
  }
  function puzzleMove(i) {
    if (puzzle.solved || !puzzleCanMove(i)) return;
    var e = puzzleEmpty();
    var tmp = puzzle.board[e];
    puzzle.board[e] = puzzle.board[i];
    puzzle.board[i] = tmp;
    puzzle.moves++;
    puzzle.solved = puzzleIsSolved();
    puzzleRender();
    var tile = $('#puzzle-grid .puzzle-tile[data-idx="' + e + '"]');
    if (tile) { tile.classList.remove('is-moved'); void tile.offsetWidth; tile.classList.add('is-moved'); }
  }
  function puzzleShuffle() {
    puzzle.board = puzzleSolvedBoard();
    for (var k = 0; k < 240; k++) {
      var e = puzzleEmpty();
      var opts = [];
      if (e % 4 > 0) opts.push(e - 1);
      if (e % 4 < 3) opts.push(e + 1);
      if (e >= 4) opts.push(e - 4);
      if (e < 12) opts.push(e + 4);
      var pick = opts[(Math.random() * opts.length) | 0];
      var tmp = puzzle.board[e]; puzzle.board[e] = puzzle.board[pick]; puzzle.board[pick] = tmp;
    }
    puzzle.moves = 0;
    puzzle.solved = puzzleIsSolved();
    puzzle.started = true;
    puzzleRender();
  }
  function puzzleReset() {
    puzzle.board = puzzleSolvedBoard();
    puzzle.moves = 0;
    puzzle.solved = true;
    puzzle.started = true;
    puzzleRender();
  }
  function renderPuzzleLabels() {
    if (!puzzle.started) { puzzle.board = puzzleSolvedBoard(); puzzle.started = true; }
    var title = $('#puzzle-title');
    if (title) title.textContent = t('life.puzzle.title');
    var hint = $('#puzzle-hint');
    if (hint) hint.textContent = t('life.puzzle.hint');
    var sc = $('#puzzle-scramble');
    if (sc) sc.textContent = t('life.puzzle.scramble');
    var rs = $('#puzzle-reset');
    if (rs) rs.textContent = t('life.puzzle.reset');
    var ml = $('#puzzle-moves-label');
    if (ml) ml.textContent = t('life.puzzle.moves');
    puzzleRender();
  }

  /* ── contact / footer ──────────────────────────────────── */
  function renderContact() {
    var c = dict().contact || {};
    var rows = $('#contact-rows');
    if (!rows) return;
    rows.innerHTML = (c.items || []).map(function (it) {
      var isCopy = /^(tencent|weixin):/.test(it.href || '');
      var act = isCopy
        ? '<button class="c-act" type="button" data-copy="' + esc(it.value) + '">' + esc(t('ui.copy', 'Copy')) + '</button>'
        : '<a class="c-act" href="' + esc(it.href) + '" target="_blank" rel="noopener noreferrer">' + esc(t('ui.open', 'Open')) + '</a>';
      return '<li class="contact-row"><span class="c-no">' + esc(it.no) + '</span>' +
        '<div><p class="c-label">' + esc(it.label) + '</p><p class="c-value">' + esc(it.value) + '</p></div>' +
        act + '</li>';
    }).join('');
    $$('[data-copy]', rows).forEach(function (btn) {
      btn.addEventListener('click', function () { copyText(btn.dataset.copy); });
    });
  }
  function renderFooter() {
    var f = dict().footer || {};
    var line = $('.foot-line');
    if (line) line.textContent = f.line || '© 2026 Golden';
    var bt = $('[data-foot-lang]');
    if (bt) bt.textContent = '中 / EN';
  }

  /* ── toast / copy ──────────────────────────────────────── */
  var toastTimer = 0;
  function toast(msg) {
    var el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-on'); }, 2000);
  }
  function copyText(text) {
    var done = function () { toast(t('ui.copied', 'Copied') + ' · ' + text); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { legacyCopy(text, done); });
    } else {
      legacyCopy(text, done);
    }
  }
  function legacyCopy(text, cb) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); cb(); } catch (e) {}
    document.body.removeChild(ta);
  }

  /* ── boot ──────────────────────────────────────────────── */
  function bootSequence() {
    var boot = $('#boot');
    if (!boot) { startSite(); return; }
    var stepsEl = $('#boot-steps');
    var countEl = $('#boot-count');
    var bar = $$('.boot-progress i');
    var kicker = $('#boot-kicker');
    var word = $('.boot-word');
    var skip = $('#boot-skip');
    var progress = 0, target = 0, shown = -1, done = false;
    var t0 = performance.now();
    var MIN = reduce ? 0 : 2000;

    var l = dict().loader || {};
    if (word && l.wordmark) {
      word.innerHTML = l.wordmark.split('').map(function (ch) {
        return '<span><i>' + esc(ch) + '</i></span>';
      }).join('');
    }
    if (kicker) kicker.textContent = (l.kicker ? '// ' + l.kicker : '// GOLDEN');
    if (stepsEl) {
      stepsEl.innerHTML = (l.steps || ['SYSTEM', 'SCENE', 'INTERFACE']).map(function (x, i) {
        return '<li data-step="' + i + '">' + esc(x) + '</li>';
      }).join('');
    }
    function paint() {
      var p = Math.round(progress);
      if (p === shown) return;
      shown = p;
      if (countEl) countEl.textContent = String(p).padStart(3, '0');
      var lit = Math.round((p / 100) * bar.length);
      bar.forEach(function (el, i) {
        el.classList.toggle('on', i < lit);
        el.classList.toggle('lit', i < lit && i >= lit - 2);
      });
      var step = p < 34 ? 0 : p < 68 ? 1 : 2;
      $$('#boot-steps li').forEach(function (li, i) {
        li.classList.toggle('is-on', i === step);
        li.classList.toggle('is-done', i < step);
      });
    }
    function tick() {
      progress += (target - progress) * 0.12;
      if (target - progress < 0.4) progress = target;
      paint();
      if (!done) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    function setTarget(v) { target = Math.min(100, Math.max(target, v)); }
    function finish() {
      if (done) return;
      done = true;
      setTarget(100);
      if (window.GoldenBoot) window.GoldenBoot.finish();
      setTimeout(out, reduce ? 30 : 300);
    }
    function out() {
      boot.classList.add('is-out');
      setTimeout(function () {
        startSite();
        boot.classList.add('is-open');
        setTimeout(function () {
          boot.classList.add('is-gone');
          if (window.GoldenBoot) window.GoldenBoot.dispose();
        }, reduce ? 60 : 740);
      }, reduce ? 60 : 400);
    }
    if (skip) skip.addEventListener('click', finish);
    var skipKeys = ['Enter', ' ', 'Escape'];
    var skipOn = function (e) {
      if (skipKeys.indexOf(e.key) > -1) { finish(); window.removeEventListener('keydown', skipOn); }
    };
    window.addEventListener('keydown', skipOn);
    boot.addEventListener('click', function (e) { if (e.target === boot) finish(); });
    if (kicker) setTimeout(function () { kicker.classList.add('is-on'); }, 180);
    var gates = [];
    if (document.fonts && document.fonts.ready) gates.push(document.fonts.ready);
    if (window.GoldenBoot && window.GoldenBoot.ready) gates.push(window.GoldenBoot.ready);
    Promise.all(gates).then(function () {
      setTarget(68);
      setTimeout(function () { setTarget(100); setTimeout(finish, 260); }, Math.max(0, MIN - (performance.now() - t0)));
    }, function () {
      setTarget(100);
      setTimeout(finish, Math.max(0, MIN - (performance.now() - t0)));
    });
    setTimeout(function () { if (!done) { setTarget(100); setTimeout(finish, 200); } }, MIN + 4000);
  }

  function startSite() {
    if (state.booted) return;
    state.booted = true;
    document.body.classList.add('is-ready');
    setTimeout(function () {
      if (window.GoldenHero) window.GoldenHero.mount();
      if (window.GoldenConstruct) {
        try { window.GoldenConstruct.mount(); } catch (e) {}
      }
      ensureArch();
      if (archApi && archApi.pause) archApi.pause();
      mountSpecimens();
      if (window.GoldenCube && window.__hasWebGL) {
        try {
          var api = window.GoldenCube.mount($('#cube-root'));
          window.__cubeApi = api;
          var stage = $('#cube-root');
          if (stage) {
            stage.addEventListener('goldencube:state', function (e) {
              paintCubeState(e.detail && e.detail.state);
            });
            stage.addEventListener('goldencube:solve', function () {
              stage.classList.remove('is-solved');
              void stage.offsetWidth;
              stage.classList.add('is-solved');
            });
            stage.addEventListener('goldencube:scramble', function () {
              stage.classList.remove('is-solved');
            });
          }
          if (api && api.state) paintCubeState(api.state());
        } catch (e) {}
      } else {
        var croot = $('#cube-root');
        if (croot) {
          croot.classList.add('no-webgl');
          var cf = $('.cube-fallback', croot);
          if (cf) cf.textContent = state.lang === 'en' ? '3D needs WebGL' : '3D 需要 WebGL';
          paintCubeState('unavailable');
        }
      }
    }, reduce ? 0 : 320);
    setTimeout(function () { revealHero(); }, reduce ? 0 : 480);
    if (location.hash) {
      var targetEl = document.getElementById(location.hash.slice(1));
      if (targetEl) setTimeout(function () {
        var off = -Math.round(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-h')) || 64) - 8;
        window.scrollTo({ top: targetEl.offsetTop + off, behavior: 'auto' });
      }, reduce ? 40 : 420);
    }
  }

  /* ── scroll ────────────────────────────────────────────── */
  function setupScroll() {
    var trace = $('#scroll-trace');
    var lastNav = '';
    function currentId() {
      var y = window.scrollY + window.innerHeight * 0.4;
      var found = '';
      SECTIONS.forEach(function (id) {
        var el = document.getElementById(id);
        if (el && el.offsetTop <= y) found = id;
      });
      return found;
    }
    var lastWarp = 0;
  function flashWarp() {
    if (reduce) return;
    var w = $('#warp');
    if (!w) return;
    var now = performance.now();
    if (now - lastWarp < 650) return;
    lastWarp = now;
    w.classList.remove('is-on');
    void w.offsetWidth;
    w.classList.add('is-on');
    setTimeout(function () { w.classList.remove('is-on'); }, 620);
  }

  function syncSection(id) {
      var idx = SECTIONS.indexOf(id);
      if (idx === state.section) return;
      state.section = idx;
      if (window.GoldenConstruct) {
        try {
          if (idx >= 0) { window.GoldenConstruct.setSection(idx); window.GoldenConstruct.resume(); }
          else window.GoldenConstruct.pause();
        } catch (e) {}
      }
      if (idx >= 0 && state.booted) flashWarp();
    }
    function onScroll() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var p = max > 0 ? window.scrollY / max : 0;
      if (trace) trace.style.transform = 'scaleX(' + Math.min(1, p).toFixed(4) + ')';
      document.body.classList.toggle('past-hero', window.scrollY > window.innerHeight * 0.55);
      var id = currentId();
      syncSection(id);
      if (id !== lastNav) {
        lastNav = id;
        $$('[data-nav]').forEach(function (a) {
          var on = a.dataset.nav === id;
          a.classList.toggle('is-current', on);
          if (on) a.setAttribute('aria-current', 'location');
          else a.removeAttribute('aria-current');
        });
        $$('[data-rail]').forEach(function (a) {
          var on = a.dataset.rail === id;
          a.classList.toggle('is-current', on);
          if (on) a.setAttribute('aria-current', 'location');
          else a.removeAttribute('aria-current');
        });
      }
      if (window.GoldenHero) {
        if (window.scrollY > window.innerHeight * 0.9) window.GoldenHero.pause();
        else window.GoldenHero.resume();
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    if (window.Lenis && !reduce) {
      try {
        state.lenis = new window.Lenis({
          duration: 1.05, smoothWheel: true, wheelMultiplier: 0.95, touchMultiplier: 1.8,
          easing: function (x) { return Math.min(1, 1.001 - Math.pow(2, -10 * x)); }
        });
        var raf = function (time) { state.lenis.raf(time); requestAnimationFrame(raf); };
        requestAnimationFrame(raf);
        state.lenis.on('scroll', onScroll);
      } catch (e) { state.lenis = null; }
    }
  }

  function bindAnchors(scope) {
    $$('a[href^="#"]', scope).forEach(function (a) {
      if (a.__bound) return;
      a.__bound = true;
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href').slice(1);
        var targetEl = document.getElementById(id);
        if (!targetEl) return;
        e.preventDefault();
        closeMenu();
        var off = -Math.round(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-h')) || 64) - 8;
        if (state.lenis) state.lenis.scrollTo(targetEl, { offset: off, duration: 1.1 });
        else window.scrollTo({ top: targetEl.offsetTop + off, behavior: reduce ? 'auto' : 'smooth' });
        if (a.dataset.nav || a.dataset.rail) history.replaceState(null, '', '#' + id);
      });
    });
  }

  /* ── menu / cursor / reveals ───────────────────────────── */
  function openMenu() {
    var menu = $('#menu');
    if (!menu) return;
    state.menuOpen = true;
    menu.hidden = false;
    document.body.classList.add('is-locked');
    $('#menu-toggle').setAttribute('aria-expanded', 'true');
    if (state.lenis) state.lenis.stop();
  }
  function closeMenu() {
    var menu = $('#menu');
    if (!menu || !state.menuOpen) return;
    state.menuOpen = false;
    menu.hidden = true;
    document.body.classList.remove('is-locked');
    $('#menu-toggle').setAttribute('aria-expanded', 'false');
    if (state.lenis) state.lenis.start();
  }
  function setupCursor() {
    if (window.matchMedia('(hover:none),(pointer:coarse)').matches) return;
    var cur = $('#cursor');
    if (!cur) return;
    var x = -100, y = -100, tx = -100, ty = -100, on = false;
    window.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!on) { on = true; cur.classList.add('is-on'); }
      var hot = e.target.closest && e.target.closest('a,button,[data-copy],.skill-row,.work-row,.contact-row,.puzzle-tile,.coverflow figure');
      cur.classList.toggle('is-hot', !!hot);
    }, { passive: true });
    document.addEventListener('pointerleave', function () { cur.classList.remove('is-on'); on = false; });
    (function loop() {
      x += (tx - x) * 0.18;
      y += (ty - y) * 0.18;
      cur.style.transform = 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0)';
      requestAnimationFrame(loop);
    })();
  }
  var tiltBound = false;
  function bindTilt(el) {
    if (!el || el.__tiltBound) return;
    el.__tiltBound = true;
    var frame = 0, tx = 0, ty = 0, curX = 0, curY = 0, active = false;
      function apply() {
        frame = 0;
        curX += (tx - curX) * 0.18;
        curY += (ty - curY) * 0.18;
        el.style.transform = 'perspective(1000px) rotateX(' + (-curY * 7).toFixed(2) + 'deg) rotateY(' + (curX * 9).toFixed(2) + 'deg)';
        if (Math.abs(tx - curX) > 0.001 || Math.abs(ty - curY) > 0.001) frame = requestAnimationFrame(apply);
      }
      el.addEventListener('pointerenter', function () { active = true; }, { passive: true });
      el.addEventListener('pointermove', function (e) {
        if (!active) return;
        var r = el.getBoundingClientRect();
        tx = (e.clientX - r.left) / r.width - 0.5;
        ty = (e.clientY - r.top) / r.height - 0.5;
        if (!frame) frame = requestAnimationFrame(apply);
      }, { passive: true });
      el.addEventListener('pointerleave', function () {
        active = false; tx = 0; ty = 0;
        if (!frame) frame = requestAnimationFrame(apply);
      });
  }

  var motion = { heroY: 0, heroS: 1, heroO: 1, rx: 0, ry: 0, trx: 0, try_: 0, vel: 0, velS: 0, lastY: 0, kineticX: 0 };

  function setupMotion() {
    motion.lastY = window.scrollY;
    if (!reduce) {
      window.addEventListener('pointermove', function (e) {
        motion.trx = (e.clientY / window.innerHeight - 0.5) * -7;
        motion.try_ = (e.clientX / window.innerWidth - 0.5) * 9;
      }, { passive: true });
      document.addEventListener('pointerleave', function () { motion.trx = 0; motion.try_ = 0; });
    }
    (function loop() {
      requestAnimationFrame(loop);
      var inner = $('.hero-inner');
      if (inner) {
        var p = reduce ? 0 : Math.min(1, window.scrollY / (window.innerHeight * 1.05));
        motion.heroY += (-p * 140 - motion.heroY) * 0.12;
        motion.heroS += ((1 - p * 0.08) - motion.heroS) * 0.12;
        motion.heroO += ((1 - p * 0.85) - motion.heroO) * 0.12;
        inner.style.transform = 'perspective(1200px) translate3d(0,' + motion.heroY.toFixed(1) + 'px,0) scale(' + motion.heroS.toFixed(3) + ')';
        inner.style.opacity = motion.heroO.toFixed(3);
      }
      var word = $('.wordmark');
      if (word && !reduce) {
        motion.rx += (motion.trx - motion.rx) * 0.08;
        motion.ry += (motion.try_ - motion.ry) * 0.08;
        word.style.transform = 'perspective(1200px) rotateX(' + motion.rx.toFixed(2) + 'deg) rotateY(' + motion.ry.toFixed(2) + 'deg) translateZ(0)';
      }
      var track = !reduce && $('#kinetic-track');
      if (track) {
        var v = window.scrollY - motion.lastY;
        motion.lastY = window.scrollY;
        motion.velS += (v - motion.velS) * 0.12;
        motion.kineticX = window.scrollY * 0.32;
        var skew = Math.max(-7, Math.min(7, motion.velS * 0.28));
        track.style.transform = 'translate3d(' + (-motion.kineticX).toFixed(1) + 'px,0,0) skewY(' + skew.toFixed(2) + 'deg)';
      }
    })();
  }

  function setupMagnetic() {
    if (reduce || window.matchMedia('(hover:none),(pointer:coarse)').matches) return;
    $$('.btn,.hero-enter,.c-act,.coverflow-btn,.puzzle button').forEach(function (el) {
      el.classList.add('mag');
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'translate3d(' + (x * 7).toFixed(1) + 'px,' + (y * 5).toFixed(1) + 'px,0)';
      }, { passive: true });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  function setupTilt() {
    if (tiltBound) return;
    tiltBound = true;
    if (reduce || window.matchMedia('(hover:none),(pointer:coarse)').matches) return;
    $$('[data-tilt]').forEach(bindTilt);
  }

  function rebindGalleryTilt() {
    if (reduce || window.matchMedia('(hover:none),(pointer:coarse)').matches) return;
    $$('#gallery [data-tilt]').forEach(bindTilt);
  }

  function setupReveals() {
    if (!('IntersectionObserver' in window)) {
      $$('[data-enter]').forEach(function (el) { el.classList.add('is-in'); });
      ensureArch();
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        var no = en.target.querySelector('.sec-no');
        if (no && !reduce && !no.__scrambled) {
          no.__scrambled = true;
          scrambleText(no, 520);
        }
        revealSection(en.target);
        if (!reduce) {
          $$('.stat-value', en.target).forEach(countUpStat);
        }
        if (en.target.id === 'life') {
          var pg = $('#puzzle-grid');
          if (pg) {
            pg.classList.add('is-entering');
            setTimeout(function () { pg.classList.remove('is-entering'); }, 1400);
          }
        }
        if (en.target.id === 'skills' && specimens.skills && specimens.skills.replay) specimens.skills.replay();
        if (en.target.id === 'works' && specimens.works && specimens.works.replay) specimens.works.replay();
        io.unobserve(en.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -5% 0px' });
    $$('[data-enter]').forEach(function (el) { io.observe(el); });
    var model = $('#ai');
    if (model) {
      var archIO = new IntersectionObserver(function (entries) {
        var en = entries[0];
        if (!archApi) ensureArch();
        if (!archApi) return;
        try {
          if (en.isIntersecting) { if (archApi.resume) archApi.resume(); }
          else if (archApi.pause) archApi.pause();
        } catch (e) {}
      }, { rootMargin: '280px 0px' });
      archIO.observe(model);
    }
  }

  /* ── init ──────────────────────────────────────────────── */
  function init() {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    var savedTheme = null, savedLang = null;
    try {
      savedTheme = localStorage.getItem('golden-theme');
      savedLang = localStorage.getItem('golden-lang');
    } catch (e) {}
    state.theme = savedTheme === 'light' ? 'light' : 'dark';
    state.lang = savedLang === 'en' ? 'en' : 'zh';
    if (!C) { C = { zh: {}, en: {} }; window.CONTENT = C; }
    applyTheme(state.theme, false);
    applyLang(state.lang, false);

    $('#lang-toggle').addEventListener('click', function () {
      applyLang(state.lang === 'zh' ? 'en' : 'zh', true);
    });
    $('#theme-toggle').addEventListener('click', negateTheme);
    $$('[data-menu-lang], [data-foot-lang]').forEach(function (b) {
      b.addEventListener('click', function () { applyLang(state.lang === 'zh' ? 'en' : 'zh', true); });
    });
    $$('[data-menu-theme], [data-foot-theme]').forEach(function (b) {
      b.addEventListener('click', negateTheme);
    });
    $('#menu-toggle').addEventListener('click', function () {
      state.menuOpen ? closeMenu() : openMenu();
    });
    $('#menu').addEventListener('click', function (e) {
      if (e.target.id === 'menu' || e.target.closest('a[data-nav]')) closeMenu();
    });

    var grid = $('#puzzle-grid');
    if (grid) grid.addEventListener('click', function (e) {
      var btn = e.target.closest('.puzzle-tile');
      if (!btn) return;
      puzzleMove(+btn.dataset.idx);
    });
    $$('[data-puzzle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.dataset.puzzle === 'scramble') puzzleShuffle();
        else puzzleReset();
      });
    });
    renderPuzzleLabels();

    var box = $('#lightbox');
    if (box) {
      box.addEventListener('click', function (e) { if (e.target === box) closeLightbox(); });
      var close = $('#lightbox-close');
      if (close) close.addEventListener('click', closeLightbox);
      var prev = $('#lightbox-prev');
      var next = $('#lightbox-next');
      if (prev) prev.addEventListener('click', function () { navLightbox(-1); });
      if (next) next.addEventListener('click', function () { navLightbox(1); });
    }
    window.addEventListener('keydown', function (e) {
      var openBox = $('#lightbox') && !$('#lightbox').hidden;
      if (openBox) {
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') navLightbox(-1);
        if (e.key === 'ArrowRight') navLightbox(1);
        return;
      }
      if (e.key === 'Escape') closeMenu();
      if (e.target && /input|textarea/i.test(e.target.tagName)) return;
      if (e.key === 'l' || e.key === 'L') negateTheme();
    });

    setupScroll();
    setupCursor();
    setupTilt();
    setupReveals();
    renderNav();
    renderRail();
    renderFooter();
    renderKinetic();
    setupCoverflow();
    setupFabCinema();
    setupMotion();
    setupMagnetic();
    bootSequence();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
