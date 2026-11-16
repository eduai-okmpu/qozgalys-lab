/* 05 · Жинағыш линза */
(function () {
  'use strict';
  const A = Q.audio, $ = (id) => document.getElementById(id);
  const c = Q.canvas($('cv'), 1000, 625);
  let ready = false;
  const LX = 500, AY = 400, PXCM = 10, H = 70, APER = 4; // линза орны, ось, px/см, нәрсе биіктігі px, апертура см
  let F = 15, lensName = 'Линза №2', d = 30, s = 20, rays = true, showF = false;
  let sharpOn = false, auto = null, drag = null, ss = s;
  const dSl = $('d'), sSl = $('s');

  Q.seg('F', (v, b) => { F = parseFloat(v) * 100; lensName = b.textContent; if (ready) update(); });
  Q.range('d', (v) => Q.fmt(v, 1) + ' см', (v) => { d = v; });
  Q.range('s', (v) => Q.fmt(v, 1) + ' см', (v) => { s = v; });
  $('rays').addEventListener('change', (e) => { rays = e.target.checked; A.click(); });
  $('focus').addEventListener('change', (e) => { showF = e.target.checked; A.click(); });
  function setLive(on, t) { $('live').classList.toggle('off', !on); $('liveTxt').textContent = t; }

  const img = () => (d > F + 0.01 ? d * F / (d - F) : Infinity); // кескін қашықтығы f
  function blurPx() { const f = img(); if (!isFinite(f)) return 99; return APER * Math.abs(ss - f) / f * 14; }
  function sharp() { const b = blurPx(); return d <= F ? 0 : Math.exp(-(b / 4) * (b / 4)) * 100; }

  // жылжыту
  const cv = $('cv');
  const candleX = () => LX - d * PXCM, screenX = () => LX + ss * PXCM;
  function hit(p) {
    if (Math.abs(p.x - candleX()) < 30 && p.y > AY - 110 && p.y < AY + 60) return 'd';
    if (Math.abs(p.x - screenX()) < 30 && p.y > AY - 150 && p.y < AY + 150) return 's';
    return null;
  }
  cv.addEventListener('pointerdown', (e) => { const h = hit(c.toLocal(e)); if (h && !auto) { drag = h; cv.setPointerCapture(e.pointerId); A.click(); } });
  cv.addEventListener('pointermove', (e) => {
    const p = c.toLocal(e);
    cv.style.cursor = drag ? 'grabbing' : hit(p) ? 'ew-resize' : 'default';
    if (!drag) return;
    if (drag === 'd') { const v = Q.clamp(Math.round((LX - p.x) / PXCM * 2) / 2, 5, 45); dSl.value = v; dSl.dispatchEvent(new Event('input')); }
    else { const v = Q.clamp(Math.round((p.x - LX) / PXCM * 2) / 2, 5, 45); sSl.value = v; sSl.dispatchEvent(new Event('input')); }
  });
  const up = () => { drag = null; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

  $('btnAuto').addEventListener('click', () => {
    const f = img();
    if (!isFinite(f) || d <= F) { A.error(); return Q.toast('Шам фокустың ішінде — нақты кескін жоқ'); }
    if (f > 45) { A.error(); return Q.toast('Кескін скамьядан тыс (' + Q.fmt(f, 1) + ' см) — шамды алыстатыңыз'); }
    auto = { target: Math.round(f * 2) / 2, cur: s }; setLive(true, 'Фокустау…');
  });

  // кесте мен график
  const table = Q.Table($('tbl'), [
    { key: 'lens', label: 'Линза' },
    { key: 'd', label: 'd, см', fmt: (v) => Q.fmt(v, 1) },
    { key: 'f', label: 'f, см', fmt: (v) => Q.fmt(v, 1) },
    { key: 'G', label: 'Γ', fmt: (v) => Q.fmt(v, 2) },
    { key: 'F', label: 'F, см', fmt: (v) => Q.fmt(v, 2) },
    { key: 'D', label: 'D, дптр', fmt: (v) => Q.fmt(v, 2) }
  ]);
  const chart = Q.Chart($('chart'), { xLabel: '1/d, м⁻¹', yLabel: '1/f, м⁻¹', xmin: 0, ymin: 0, xmaxDef: 10, ymaxDef: 10 });
  function update() {
    const rows = table.rows.filter((r) => r.lens === lensName);
    const xs = rows.map((r) => 100 / r.d), ys = rows.map((r) => 100 / r.f);
    const lines = []; let html;
    const fit = new Set(rows.map((r) => r.d)).size >= 2 ? Q.linreg(xs, ys) : null;
    if (fit) {
      lines.push({ f: (x) => fit.a * x + fit.b, color: '#1B2BFF' });
      const Ffit = 100 / fit.b, Fs = rows.map((r) => r.F);
      html = '<b>' + lensName + '</b> · түзу: 1/f = ' + Q.fmt(fit.a, 2) + '·(1/d) + ' + Q.fmt(fit.b, 2) + '<br>Еңіс ≈ −1 болуы керек (' + Q.fmt(fit.a, 2) + ') · ось қиылысы 1/F → <b>F = ' + Q.fmt(Ffit, 1) + ' см</b>, D = <b>' + Q.fmt(fit.b, 2) + ' дптр</b>' +
        '<br>Кестедегі орташа F = <b>' + Q.fmt(Q.mean(Fs), 2) + ' ± ' + Q.fmt(Q.sd(Fs), 2) + ' см</b>';
    } else html = rows.length ? 'Шамды басқа орынға жылжытып, тағы анық кескін алып жазыңыз.' : lensName + ' үшін әзірге өлшем жоқ. Экранда анық кескін алып, «Жазу» басыңыз.';
    chart.set(rows.map((r, i) => ({ x: xs[i], y: ys[i] })), lines);
    $('result').innerHTML = html;
  }
  ready = true;
  update();
  $('btnRec').addEventListener('click', () => {
    const sh = sharp();
    if (d <= F) { A.error(); return Q.toast('Кескін жалған — экранда көрінбейді'); }
    if (sh < 80) { A.error(); return Q.toast('Кескін анық емес (' + Math.round(sh) + '%) — экранды жылжытыңыз'); }
    const fr = Math.round((s + Q.gauss(0.25)) * 10) / 10, dr = d;
    const Fc = dr * fr / (dr + fr);
    table.add({ lens: lensName, d: dr, f: fr, G: fr / dr, F: Fc, D: 100 / Fc });
    update(); A.success();
    Q.toast('Жазылды: d = ' + Q.fmt(dr, 1) + ' см, f = ' + Q.fmt(fr, 1) + ' см → F = ' + Q.fmt(Fc, 1) + ' см');
  });
  $('btnClear').addEventListener('click', () => { table.clear(); update(); A.click(); });
  $('btnCsv').addEventListener('click', () => { if (!table.rows.length) return Q.toast('Кесте бос'); table.csv('linza'); A.pop(); });

  // canvas filter қолдауын тексеру
  const supportsFilter = (function () { try { const t = document.createElement('canvas').getContext('2d'); t.filter = 'blur(2px)'; return t.filter === 'blur(2px)'; } catch (e) { return false; } })();

  let last = performance.now(), tt = 0;
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.04); last = now; tt += dt;
    if (auto) {
      const diff = auto.target - auto.cur;
      if (Math.abs(diff) < 0.05) { sSl.value = auto.target; sSl.dispatchEvent(new Event('input')); auto = null; setLive(false, 'Фокусталды'); }
      else { auto.cur += Math.sign(diff) * Math.min(Math.abs(diff), 18 * dt); sSl.value = auto.cur; sSl.dispatchEvent(new Event('input')); }
    }
    ss += (s - ss) * Math.min(1, dt * 12);
    const sh = sharp();
    if (sh > 95 && !sharpOn) { sharpOn = true; A.chime(); setLive(true, 'Кескін анық!'); }
    if (sh < 80 && sharpOn) { sharpOn = false; setLive(false, 'Экранды жылжытыңыз'); }
    draw(sh);
    const f = img();
    $('roD').textContent = Q.fmt(d, 1) + ' см';
    $('roF').textContent = Q.fmt(s, 1) + ' см';
    $('roG').textContent = d > F && isFinite(f) ? Q.fmt(f / d, 2) + '×' : '—';
    $('roS').textContent = d <= F ? 'жалған' : Math.round(sh) + '%';
    requestAnimationFrame(frame);
  }

  function candle(g, x, y, k, flick, inv) {
    // x,y — табанның ортасы; k — масштаб; inv — төңкерілген
    g.save(); g.translate(x, y); if (inv) g.scale(1, -1); g.scale(k, k);
    g.fillStyle = '#FFFFFF'; g.strokeStyle = '#0A0A0A'; g.lineWidth = 2 / k;
    g.fillRect(-10, -40, 20, 40); g.strokeRect(-10, -40, 20, 40);
    g.strokeStyle = '#0A0A0A'; g.lineWidth = 2 / k; g.beginPath(); g.moveTo(0, -40); g.lineTo(0, -46); g.stroke();
    const fh = 24 + flick * 4;
    g.fillStyle = '#FFB000'; g.beginPath(); g.moveTo(0, -46 - fh); g.quadraticCurveTo(12, -50, 0, -42); g.quadraticCurveTo(-12, -50, 0, -46 - fh); g.fill();
    g.fillStyle = '#E8FF47'; g.beginPath(); g.ellipse(0, -52, 4, 7, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  function draw(sh) {
    c.clearRect(0, 0, 1000, 625);
    c.fillStyle = '#F6F7FF'; c.fillRect(0, 0, 1000, 625);
    Q.grid(c, 25);
    const flick = Math.sin(tt * 13) * 0.5 + Math.sin(tt * 7.3) * 0.5;
    // скамья
    c.fillStyle = '#0A0A0A'; c.fillRect(30, AY + 160, 940, 14);
    for (let cm = -45; cm <= 45; cm += 5) {
      const x = LX + cm * PXCM;
      c.fillStyle = '#E8FF47'; c.fillRect(x - 1, AY + 162, 2, cm % 10 === 0 ? 10 : 5);
      if (cm % 10 === 0) Q.text(c, String(Math.abs(cm)), x, AY + 196, { size: 11, mono: true, align: 'center' });
    }
    // оптикалық ось
    c.strokeStyle = 'rgba(10,10,10,.35)'; c.setLineDash([8, 6]); c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(30, AY); c.lineTo(970, AY); c.stroke(); c.setLineDash([]);
    // фокустар
    if (showF) [-1, 1, -2, 2].forEach((k) => {
      const x = LX + k * F * PXCM;
      c.fillStyle = Math.abs(k) === 1 ? '#E5484D' : '#999';
      c.beginPath(); c.arc(x, AY, 6, 0, Math.PI * 2); c.fill();
      Q.text(c, (Math.abs(k) === 2 ? '2F' : 'F'), x, AY + 24, { size: 13, weight: 900, align: 'center', color: c.fillStyle });
    });
    // шам
    const cx = candleX();
    c.fillStyle = 'rgba(255,200,0,' + (0.12 + flick * 0.03) + ')'; c.beginPath(); c.arc(cx, AY - 60, 60, 0, Math.PI * 2); c.fill();
    candle(c, cx, AY, 1, flick, false);
    c.fillStyle = '#0A0A0A'; c.fillRect(cx - 4, AY, 8, 160); c.fillRect(cx - 18, AY + 150, 36, 10);
    // линза
    c.fillStyle = 'rgba(27,43,255,.18)'; c.strokeStyle = '#1B2BFF'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(LX, AY - 150); c.quadraticCurveTo(LX + 26 * (20 / F), AY, LX, AY + 150); c.quadraticCurveTo(LX - 26 * (20 / F), AY, LX, AY - 150); c.fill(); c.stroke();
    c.fillStyle = '#0A0A0A';
    c.fillRect(LX - 18, AY + 150, 36, 10);
    Q.text(c, lensName, LX, AY - 162, { size: 13, weight: 900, align: 'center', color: '#1B2BFF' });
    // сәулелер
    const tipY = AY - H, f = img();
    if (rays) {
      c.lineWidth = 2;
      const ix = isFinite(f) ? LX + f * PXCM : null, iy = isFinite(f) ? AY + H * f / d : null;
      // 1: параллель → F' арқылы
      ray(cx, tipY, LX, tipY, '#E5484D');
      extend(LX, tipY, LX + F * PXCM, AY, '#E5484D');
      // 2: центр арқылы
      extend(cx, tipY, LX, AY, '#1B2BFF', true);
      // 3: F арқылы → параллель
      if (d > F + 0.3) {
        const yl = tipY + (AY - tipY) * (d / (d - F)); // F арқылы өтетін сәуленің линзамен қиылысы
        if (Math.abs(yl - AY) < 150) { ray(cx, tipY, LX, yl, '#0A8A3A'); ray(LX, yl, 970, yl, '#0A8A3A'); }
      }
      if (d < F) { // жалған кескін — жалғастырулар
        const vf = d * F / (F - d), vx = LX - vf * PXCM, vy = AY - H * vf / d;
        c.setLineDash([5, 6]); c.strokeStyle = 'rgba(229,72,77,.7)'; c.beginPath(); c.moveTo(LX, tipY); c.lineTo(vx, vy); c.stroke();
        c.strokeStyle = 'rgba(27,43,255,.7)'; c.beginPath(); c.moveTo(LX, AY); c.lineTo(vx, vy); c.stroke(); c.setLineDash([]);
        if (vx > 30) { c.globalAlpha = 0.35; candle(c, vx, AY, vf / d, flick, false); c.globalAlpha = 1; Q.text(c, 'жалған кескін', vx, vy - 14, { size: 12, weight: 800, align: 'center', color: '#E5484D' }); }
      }
      if (ix && ix < 970) { c.fillStyle = '#E5484D'; c.beginPath(); c.arc(ix, iy, 5, 0, Math.PI * 2); c.fill(); }
    }
    // экран
    const sx = screenX();
    c.fillStyle = '#FFFFFF'; c.strokeStyle = '#0A0A0A'; c.lineWidth = 3;
    c.fillRect(sx - 6, AY - 150, 12, 300); c.strokeRect(sx - 6, AY - 150, 12, 300);
    c.fillStyle = '#0A0A0A'; c.fillRect(sx - 18, AY + 150, 36, 10);
    if (d > F && isFinite(f)) {
      const glow = Q.clamp(sh / 100, 0.15, 1);
      const yi1 = AY, yi2 = AY + H * (f / d) * (ss / f), spread = blurPx() * 1.2;
      c.fillStyle = 'rgba(255,176,0,' + glow * 0.8 + ')';
      c.fillRect(sx - 5, Math.min(yi1, yi2) - spread, 10, Math.abs(yi2 - yi1) + spread * 2);
    }
    Q.text(c, 'ЭКРАН', sx, AY - 162, { size: 12, weight: 900, align: 'center' });
    // экран бетінің көрінісі (врезка)
    const bx = 30, by = 24, bw = 300, bh = 210;
    c.fillStyle = '#0A0A0A'; Q.roundRect(c, bx - 6, by - 6, bw + 12, bh + 40, 18); c.fill();
    c.fillStyle = '#F2EFE6'; c.fillRect(bx, by, bw, bh);
    c.save(); c.beginPath(); c.rect(bx, by, bw, bh); c.clip();
    if (d > F && isFinite(f) && f < 200) {
      const G = (ss / d) * 1.3, bl = blurPx() * 1.4, cx0 = bx + bw / 2, cy0 = by + 30;
      const bright = Q.clamp(Math.pow(d / f, 0.6), 0.25, 1.2);
      if (supportsFilter) { c.filter = 'blur(' + Math.min(bl, 40) + 'px)'; candle(c, cx0, cy0, G, flick, true); c.filter = 'none'; }
      else {
        const n = bl < 1 ? 1 : 14; c.globalAlpha = 1 / Math.sqrt(n);
        for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; candle(c, cx0 + Math.cos(a) * bl * 0.7, cy0 + Math.sin(a) * bl * 0.7, G, flick, true); }
        c.globalAlpha = 1;
      }
      c.fillStyle = 'rgba(242,239,230,' + Q.clamp(1 - bright, 0, 0.7) + ')'; c.fillRect(bx, by, bw, bh);
    } else {
      c.fillStyle = 'rgba(255,190,60,.25)'; c.beginPath(); c.arc(bx + bw / 2, by + bh / 2, 120, 0, Math.PI * 2); c.fill();
      Q.text(c, d <= F ? 'Нақты кескін жоқ' : 'Кескін тым алыс', bx + bw / 2, by + bh / 2 + 5, { size: 15, weight: 800, align: 'center', color: '#555' });
    }
    c.restore();
    Q.text(c, 'ЭКРАНДАҒЫ КӨРІНІС', bx + 6, by + bh + 25, { size: 11, weight: 800, color: '#fff' });
    // анықтық шкаласы
    const mw = 120, mx = bx + bw - mw - 4;
    c.fillStyle = '#333'; c.fillRect(mx, by + bh + 14, mw, 10);
    c.fillStyle = sh > 95 ? '#E8FF47' : sh > 80 ? '#7EE2A8' : '#E5484D'; c.fillRect(mx, by + bh + 14, mw * sh / 100, 10);
  }
  function ray(x1, y1, x2, y2, col) { c.strokeStyle = col; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
  function extend(x1, y1, x2, y2, col) {
    const dx = x2 - x1, dy = y2 - y1, t = (970 - x1) / dx;
    c.strokeStyle = col; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 + dx * t, y1 + dy * t); c.stroke();
  }
  requestAnimationFrame(frame);
})();
