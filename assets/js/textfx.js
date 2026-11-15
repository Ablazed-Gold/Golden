/* TEXTFX — per-character mechanical text reveal (Endfield-flavoured).
   Splits a plain-text element into per-character spans, then plays a hard
   clip-rise with a stagger. No libraries. */
(function () {
  'use strict';

  var SELECTORS = [
    '.hero .wordmark-solid',
    '.hero .wordmark-hollow',
    '.hero-tagline',
    '#about .sec-head h2',
    '.about-lead',
    '.about-p',
    '#skills .sec-head h2',
    '#works .sec-head h2',
    '#ai .sec-head h2',
    '.model-lead',
    '#arena .sec-head h2',
    '#arena-title',
    '#cube .sec-head h2',
    '.cube-lead',
    '.cube-hint',
    '#fab .sec-head h2',
    '.fab-lead',
    '#life .sec-head h2',
    '.life-block .lb-zh',
    '#contact .sec-head h2'
  ];

  var CJK = /[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]/;

  function tokenize(text) {
    var out = [];
    var i = 0;
    while (i < text.length) {
      var ch = text[i];
      if (/\s/.test(ch)) {
        out.push({ type: 'space', text: ' ' });
        i++;
        continue;
      }
      if (CJK.test(ch)) {
        out.push({ type: 'char', text: ch });
        i++;
        continue;
      }
      var m = text.slice(i).match(/^[A-Za-z0-9@._%+\-/’'&]+/);
      if (m) {
        out.push({ type: 'word', text: m[0] });
        i += m[0].length;
        continue;
      }
      out.push({ type: 'char', text: ch });
      i++;
    }
    return out;
  }

  function buildHTML(text) {
    var tokens = tokenize(text);
    var html = '';
    var index = 0;
    for (var t = 0; t < tokens.length; t++) {
      var tok = tokens[t];
      if (tok.type === 'space') { html += ' '; continue; }
      if (tok.type === 'word') {
        html += '<span class="wd">';
        for (var c = 0; c < tok.text.length; c++) {
          html += '<span class="ch" style="--i:' + index + '">' + esc(tok.text[c]) + '</span>';
          index++;
        }
        html += '</span>';
      } else {
        html += '<span class="ch" style="--i:' + index + '">' + esc(tok.text) + '</span>';
        index++;
      }
    }
    return { html: html, count: index };
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function prepareElement(el) {
    if (!el) return el;
    var hasChars = el.querySelector('.ch');
    if (el.__split && hasChars) return el;
    el.__split = false;
    var raw = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!raw || raw.length > 220) return el;
    var built = buildHTML(raw);
    if (!built.count) return el;
    el.setAttribute('data-raw', raw);
    el.classList.add('split');
    el.__split = true;
    el.__count = built.count;
    el.innerHTML = built.html;
    return el;
  }

  function revealElement(el, base, stagger) {
    if (!el || !el.__split) return;
    var chars = el.querySelectorAll('.ch');
    if (!chars.length) return;
    var count = chars.length;
    var gap = stagger != null ? stagger : Math.max(8, Math.min(26, Math.round(760 / Math.max(1, count))));
    for (var i = 0; i < count; i++) {
      chars[i].style.setProperty('--d', String(Math.round(base + i * gap)));
    }
    el.classList.add('is-typing');
  }

  function revealAllIn(scope, base) {
    if (!scope) return;
    var els = scope.querySelectorAll('.split:not(.is-typing)');
    for (var i = 0; i < els.length; i++) {
      revealElement(els[i], base + i * 70);
    }
  }

  window.GoldenText = {
    prepare: function (scope) {
      var root = scope || document;
      for (var s = 0; s < SELECTORS.length; s++) {
        var nodes = root.querySelectorAll(SELECTORS[s]);
        for (var n = 0; n < nodes.length; n++) prepareElement(nodes[n]);
      }
    },
    revealElement: revealElement,
    revealAllIn: revealAllIn,
    reset: function (scope) {
      var root = scope || document;
      var els = root.querySelectorAll('.split');
      for (var i = 0; i < els.length; i++) {
        els[i].classList.remove('is-typing');
        var ch = els[i].querySelectorAll('.ch');
        for (var c = 0; c < ch.length; c++) ch[c].style.removeProperty('--d');
      }
    }
  };
})();
