/* ҚОЗҒАЛЫС — ортақ құралдар: дыбыс, кесте, график, есептеулер */
(function () {
  'use strict';
  const Q = (window.Q = {});

  /* ---------- сандар ---------- */
  Q.fmt = function (v, d) {
    if (v === null || v === undefined || !isFinite(v)) return '—';
    return Number(v).toFixed(d === undefined ? 2 : d).replace('.', ',').replace('-', '−');
  };
  Q.gauss = function (sigma) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  Q.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  Q.lerp = (a, b, t) => a + (b - a) * t;
  /* y = a·x + b */
  Q.linreg = function (xs, ys) {
    const n = xs.length;
    if (n < 2) return null;
    let sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
    for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; syy += ys[i] * ys[i]; }
    const den = n * sxx - sx * sx;
    if (Math.abs(den) < 1e-12) return null;
    const a = (n * sxy - sx * sy) / den;
    const b = (sy - a * sx) / n;
    const rden = Math.sqrt(den * (n * syy - sy * sy));
    const r = rden ? (n * sxy - sx * sy) / rden : 1;
    return { a, b, r2: r * r };
  };
  /* y = a·x (координат басы арқылы) */
  Q.linreg0 = function (xs, ys) {
    let sxx = 0, sxy = 0;
    for (let i = 0; i < xs.length; i++) { sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; }
    return sxx ? sxy / sxx : null;
  };
  Q.mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN);
  Q.sd = function (a) {
    if (a.length < 2) return 0;
    const m = Q.mean(a);
    return Math.sqrt(a.reduce((s, v) => s + (v - m) * (v - m), 0) / (a.length - 1));
  };

  /* ---------- дыбыс (Web Audio, файлсыз) ---------- */
  const A = (Q.audio = {});
  let ctx = null, master = null;
  let muted = false;
  try { muted = localStorage.getItem('qz-muted') === '1'; } catch (e) {}
  A.isMuted = () => muted;
  A.ensure = function () {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.6;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  A.setMuted = function (m) {
    muted = m;
    try { localStorage.setItem('qz-muted', m ? '1' : '0'); } catch (e) {}
    if (master) master.gain.setTargetAtTime(m ? 0 : 0.6, ctx.currentTime, 0.02);
    document.querySelectorAll('[data-sound]').forEach(updSoundBtn);
  };
  A.tone = function (freq, dur, type, vol, slideTo) {
    if (muted || !A.ensure()) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.25, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  };
  A.noise = function (dur, vol, hp) {
    if (muted || !A.ensure()) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const s = ctx.createBufferSource(); s.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp || 1200;
    const g = ctx.createGain(); g.gain.value = vol || 0.3;
    s.connect(f); f.connect(g); g.connect(master); s.start();
  };
  A.tick = () => A.tone(1800, 0.04, 'square', 0.12);
  A.tock = () => A.tone(1200, 0.05, 'square', 0.10);
  A.click = () => A.noise(0.03, 0.35, 2500);
  A.pop = () => A.tone(520, 0.12, 'sine', 0.25, 980);
  A.chime = function () { A.tone(880, 0.5, 'sine', 0.2); setTimeout(() => A.tone(1320, 0.6, 'sine', 0.16), 90); };
  A.success = function () { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => A.tone(f, 0.22, 'triangle', 0.2), i * 80)); };
  A.error = function () { A.tone(220, 0.25, 'sawtooth', 0.15, 140); };
  A.boom = function () { A.noise(0.6, 0.7, 120); A.tone(90, 0.5, 'sine', 0.5, 40); };
  A.spark = function () { A.noise(0.08, 0.25, 4000); };
  /* ұзақ дыбыс: гул, ызың */
  A.hum = function (type) {
    if (!A.ensure()) return { set() {}, stop() {} };
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = type || 'sawtooth'; o.frequency.value = 100;
    f.type = 'lowpass'; f.frequency.value = 900;
    g.gain.value = 0;
    o.connect(f); f.connect(g); g.connect(master); o.start();
    return {
      set(freq, vol) {
        o.frequency.setTargetAtTime(freq, ctx.currentTime, 0.05);
        g.gain.setTargetAtTime(muted ? 0 : vol, ctx.currentTime, 0.05);
      },
      stop() { g.gain.setTargetAtTime(0, ctx.currentTime, 0.05); setTimeout(() => { try { o.stop(); } catch (e) {} }, 300); }
    };
  };
  function updSoundBtn(b) {
    b.setAttribute('aria-pressed', String(!muted));
    b.setAttribute('aria-label', muted ? 'Дыбысты қосу' : 'Дыбысты өшіру');
    b.innerHTML = muted
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4z"/><path d="M23 9l-6 6M17 9l6 6"/></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>';
  }
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-sound]').forEach(function (b) {
      updSoundBtn(b);
      b.addEventListener('click', function () { A.ensure(); A.setMuted(!muted); if (!muted) A.pop(); });
    });
    // Браузер дыбысты алғашқы басудан кейін ғана рұқсат етеді
    const unlock = () => { A.ensure(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    // scroll reveal
    const els = document.querySelectorAll('.rv');
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
      els.forEach((e) => io.observe(e));
    } else els.forEach((e) => e.classList.add('in'));
  });

  /* ---------- хабарлама ---------- */
  let toastEl, toastT;
  Q.toast = function (msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('show'), 2600);
  };

  /* ---------- canvas ---------- */
  Q.canvas = function (cv, W, H) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.W = W; c.H = H;
    c.toLocal = function (e) {
      const r = cv.getBoundingClientRect();
      return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
    };
    return c;
  };
  Q.grid = function (c, step, color) {
    c.save(); c.strokeStyle = color || 'rgba(27,43,255,.08)'; c.lineWidth = 1; c.beginPath();
    for (let x = 0; x <= c.W; x += step) { c.moveTo(x + .5, 0); c.lineTo(x + .5, c.H); }
    for (let y = 0; y <= c.H; y += step) { c.moveTo(0, y + .5); c.lineTo(c.W, y + .5); }
    c.stroke(); c.restore();
  };
  Q.text = function (c, s, x, y, o) {
    o = o || {};
    c.save();
    c.font = (o.weight || 700) + ' ' + (o.size || 14) + 'px ' + (o.mono ? "'JetBrains Mono', monospace" : 'Montserrat, sans-serif');
    c.fillStyle = o.color || '#0A0A0A'; c.textAlign = o.align || 'left'; c.textBaseline = o.base || 'alphabetic';
    if (o.bg) {
      const w = c.measureText(s).width, h = (o.size || 14) + 10;
      const bx = o.align === 'center' ? x - w / 2 - 8 : o.align === 'right' ? x - w - 16 : x - 8;
      c.fillStyle = o.bg; roundRect(c, bx, y - h + 6, w + 16, h, 8); c.fill();
      c.fillStyle = o.color || '#0A0A0A';
    }
    c.fillText(s, x, y); c.restore();
  };
  function roundRect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  Q.roundRect = roundRect;

  /* ---------- range / seg ---------- */
  Q.range = function (id, fmt, cb) {
    const el = document.getElementById(id);
    const out = document.querySelector('output[for="' + id + '"]');
    const f = () => { const v = parseFloat(el.value); if (out) out.textContent = fmt(v); cb && cb(v); };
    el.addEventListener('input', f);
    let last = 0;
    el.addEventListener('input', () => { const now = performance.now(); if (now - last > 45) { A.tone(600 + (el.value - el.min) / (el.max - el.min) * 900, 0.03, 'triangle', 0.05); last = now; } });
    f();
    return el;
  };
  Q.seg = function (id, cb) {
    const box = document.getElementById(id);
    const bs = box.querySelectorAll('button');
    bs.forEach((b) => b.addEventListener('click', () => {
      bs.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      A.click(); cb(b.dataset.v, b);
    }));
    const cur = box.querySelector('[aria-pressed=true]') || bs[0];
    cb(cur.dataset.v, cur);
  };

  /* ---------- өлшеу кестесі ---------- */
  Q.Table = function (tbl, cols, opts) {
    opts = opts || {};
    const rows = [];
    const thead = tbl.createTHead(), tb = tbl.tBodies[0] || tbl.createTBody();
    thead.innerHTML = '<tr><th>№</th>' + cols.map((c) => '<th>' + c.label + '</th>').join('') + '</tr>';
    function render(newIdx) {
      if (!rows.length) {
        tb.innerHTML = '<tr class="empty"><td colspan="' + (cols.length + 1) + '">' + (opts.empty || 'Әзірге өлшем жоқ. «Жазу» батырмасын басыңыз.') + '</td></tr>';
        return;
      }
      tb.innerHTML = rows.map((r, i) => '<tr' + (i === newIdx ? ' class="new"' : '') + '><td>' + (i + 1) + '</td>' +
        cols.map((c) => '<td>' + (c.fmt ? c.fmt(r[c.key], r) : r[c.key]) + '</td>').join('') + '</tr>').join('');
      const wrap = tbl.parentElement;
      if (newIdx !== undefined && wrap) wrap.scrollTop = wrap.scrollHeight;
    }
    render();
    return {
      rows,
      add(r) { rows.push(r); render(rows.length - 1); },
      clear() { rows.length = 0; render(); },
      csv(name) {
        const head = ['№'].concat(cols.map((c) => c.label.replace(/<[^>]+>/g, '')));
        const lines = [head.join(';')].concat(rows.map((r, i) => [i + 1].concat(cols.map((c) => {
          const v = c.fmt ? c.fmt(r[c.key], r) : r[c.key];
          return String(v).replace(/<[^>]+>/g, '');
        })).join(';')));
        const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = (name || 'olshemder') + '.csv';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }
    };
  };

  /* ---------- график ---------- */
  function niceStep(range, n) {
    const raw = range / n, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
    return (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p;
  }
  Q.Chart = function (cv, o) {
    const c = Q.canvas(cv, 640, 480);
    const P = { l: 70, r: 24, t: 24, b: 58 };
    let pts = [], lines = [];
    function draw() {
      c.clearRect(0, 0, c.W, c.H);
      c.fillStyle = '#fff'; c.fillRect(0, 0, c.W, c.H);
      let xmin = o.xmin !== undefined ? o.xmin : Infinity, xmax = -Infinity, ymin = o.ymin !== undefined ? o.ymin : Infinity, ymax = -Infinity;
      pts.forEach((p) => { xmin = Math.min(xmin, p.x); xmax = Math.max(xmax, p.x); ymin = Math.min(ymin, p.y); ymax = Math.max(ymax, p.y); });
      if (!pts.length) { xmin = o.xmin || 0; xmax = o.xmaxDef || 1; ymin = o.ymin || 0; ymax = o.ymaxDef || 1; }
      if (xmax - xmin < 1e-9) { xmax = xmin + 1; }
      if (ymax - ymin < 1e-9) { ymax = ymin + 1; }
      const px = (xmax - xmin) * 0.08, py = (ymax - ymin) * 0.12;
      if (o.xmin === undefined) xmin -= px; xmax += px;
      if (o.ymin === undefined) ymin -= py; ymax += py;
      const X = (x) => P.l + (x - xmin) / (xmax - xmin) * (c.W - P.l - P.r);
      const Y = (y) => c.H - P.b - (y - ymin) / (ymax - ymin) * (c.H - P.t - P.b);
      // grid
      c.strokeStyle = '#E6E8F2'; c.lineWidth = 1;
      c.font = "600 12px 'JetBrains Mono', monospace"; c.fillStyle = '#3A3A3A';
      const sx = niceStep(xmax - xmin, 6), sy = niceStep(ymax - ymin, 6);
      c.textAlign = 'center';
      for (let x = Math.ceil(xmin / sx) * sx; x <= xmax + 1e-9; x += sx) {
        c.beginPath(); c.moveTo(X(x), P.t); c.lineTo(X(x), c.H - P.b); c.stroke();
        c.fillText(Q.fmt(x, sx < 0.1 ? 2 : sx < 1 ? 1 : 0), X(x), c.H - P.b + 18);
      }
      c.textAlign = 'right';
      for (let y = Math.ceil(ymin / sy) * sy; y <= ymax + 1e-9; y += sy) {
        c.beginPath(); c.moveTo(P.l, Y(y)); c.lineTo(c.W - P.r, Y(y)); c.stroke();
        c.fillText(Q.fmt(y, sy < 0.1 ? 2 : sy < 1 ? 1 : 0), P.l - 8, Y(y) + 4);
      }
      // axes
      c.strokeStyle = '#0A0A0A'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(P.l, P.t); c.lineTo(P.l, c.H - P.b); c.lineTo(c.W - P.r, c.H - P.b); c.stroke();
      c.font = "700 14px Montserrat, sans-serif"; c.fillStyle = '#0A0A0A';
      c.textAlign = 'right'; c.fillText(o.xLabel, c.W - P.r, c.H - 12);
      c.save(); c.translate(18, P.t); c.rotate(-Math.PI / 2); c.textAlign = 'right'; c.fillText(o.yLabel, 0, 0); c.restore();
      // lines
      c.save(); c.beginPath(); c.rect(P.l, P.t, c.W - P.l - P.r, c.H - P.t - P.b); c.clip();
      lines.forEach((L) => {
        c.strokeStyle = L.color || '#0A0A0A'; c.lineWidth = L.width || 2.5; c.setLineDash(L.dash || []);
        c.beginPath();
        for (let i = 0; i <= 120; i++) {
          const x = xmin + (xmax - xmin) * i / 120, y = L.f(x);
          if (!isFinite(y)) continue;
          i ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y));
        }
        c.stroke(); c.setLineDash([]);
      });
      c.restore();
      // points
      pts.forEach((p, i) => {
        c.fillStyle = i === pts.length - 1 ? '#E8FF47' : '#1B2BFF';
        c.strokeStyle = '#0A0A0A'; c.lineWidth = 2;
        c.beginPath(); c.arc(X(p.x), Y(p.y), 7, 0, Math.PI * 2); c.fill(); c.stroke();
      });
      if (!pts.length) {
        c.font = "600 15px Montserrat, sans-serif"; c.fillStyle = '#555'; c.textAlign = 'center';
        c.fillText('График өлшемдер жазылғанда пайда болады', (P.l + c.W - P.r) / 2, (P.t + c.H - P.b) / 2);
      }
    }
    draw();
    return { set(p, l) { pts = p; lines = l || []; draw(); } };
  };
})();
