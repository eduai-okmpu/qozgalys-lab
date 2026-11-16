/* 02 · Бойль–Мариотт заңы */
(function () {
  'use strict';
  const A = Q.audio, $ = (id) => document.getElementById(id);
  const c = Q.canvas($('cv'), 1000, 625);
  const X0 = 300, X1 = 560, BOT = 585, PXML = 4.6; // цилиндр, 1 мл = 4.6 px
  const C = 100 * 100 / 293; // p[кПа] = C·T/V[мл]
  let V = 100, Vshow = 100, T = 293, trailOn = true;
  let pShow = 100, hits = 0, hitRate = 0, hitT = 0, lastHitSnd = 0;
  let auto = null, drag = false;
  const vSlider = $('V');

  Q.range('V', (v) => Math.round(v) + ' мл', (v) => { if (Math.abs(v - V) > 0.5 && !auto) A.noise(0.06, 0.08, 800); V = v; });
  Q.seg('temp', (v) => { T = parseFloat(v); });
  $('trail').addEventListener('change', (e) => { trailOn = e.target.checked; A.click(); });

  // молекулалар
  const parts = [];
  const top = () => BOT - Vshow * PXML;
  for (let i = 0; i < 70; i++) {
    const a = Math.random() * Math.PI * 2;
    parts.push({ x: Q.lerp(X0 + 10, X1 - 10, Math.random()), y: Q.lerp(BOT - 400, BOT - 10, Math.random()), vx: Math.cos(a), vy: Math.sin(a), tr: [] });
  }
  const pTrue = () => C * T / V;

  // кесте
  const table = Q.Table($('tbl'), [
    { key: 't', label: 't, °C', fmt: (v) => Math.round(v - 273) },
    { key: 'V', label: 'V, мл', fmt: (v) => Math.round(v) },
    { key: 'p', label: 'p, кПа', fmt: (v) => Q.fmt(v, 1) },
    { key: 'pv', label: 'pV, кПа·мл', fmt: (v) => Math.round(v) }
  ]);
  let mode = 'pv';
  const chart = Q.Chart($('chart'), { xLabel: 'V, мл', yLabel: 'p, кПа', xmin: 0, ymin: 0, xmaxDef: 100, ymaxDef: 500 });
  function update() {
    const temps = [...new Set(table.rows.map((r) => r.t))];
    const lines = [], pts = [];
    let html = '';
    temps.forEach((tt) => {
      const rows = table.rows.filter((r) => r.t === tt);
      const pv = rows.map((r) => r.pv), m = Q.mean(pv), spread = Q.sd(pv) / m * 100;
      const col = tt === 273 ? '#1B2BFF' : tt === 293 ? '#0A0A0A' : '#E5484D';
      if (mode === 'pv') { rows.forEach((r) => pts.push({ x: r.V, y: r.p })); lines.push({ f: (x) => m / x, color: col }); }
      else { rows.forEach((r) => pts.push({ x: 1 / r.V, y: r.p })); lines.push({ f: (x) => m * x, color: col }); }
      html += (html ? '<br>' : '') + '<b>' + Math.round(tt - 273) + ' °C</b>: ' + rows.length + ' өлшем · pV ≈ <b>' + Math.round(m) + ' кПа·мл</b>' +
        (rows.length > 1 ? ' · ауытқу <b>±' + Q.fmt(spread, 1) + '%</b>' : '');
    });
    if (table.rows.length >= 3) html += '<br>' + (Q.sd(table.rows.filter((r) => r.t === table.rows[0].t).map((r) => r.pv)) / Q.mean(table.rows.filter((r) => r.t === table.rows[0].t).map((r) => r.pv)) < 0.03
      ? 'Қорытынды: тұрақты температурада pV көбейтіндісі іс жүзінде өзгермейді — Бойль–Мариотт заңы орындалады.' : '');
    if (mode === 'pv') { chart.set(pts, lines); }
    else { chart2.set(pts, lines); }
    $('chart').style.display = mode === 'pv' ? '' : 'none';
    $('chart2').style.display = mode === 'pv' ? 'none' : '';
    $('result').innerHTML = html || 'Әртүрлі көлемде кемінде 3 өлшем жазыңыз — pV көбейтіндісі тексеріледі.';
  }
  // екінші график (1/V)
  const cv2 = document.createElement('canvas');
  cv2.id = 'chart2'; cv2.className = 'chart'; cv2.setAttribute('role', 'img'); cv2.setAttribute('aria-label', 'p(1/V) графигі'); cv2.style.display = 'none';
  $('chart').after(cv2);
  const chart2 = Q.Chart(cv2, { xLabel: '1/V, 1/мл', yLabel: 'p, кПа', xmin: 0, ymin: 0, xmaxDef: 0.05, ymaxDef: 500 });
  Q.seg('mode', (v) => { mode = v; update(); });

  function record() {
    const p = pTrue() * (1 + Q.gauss(0.006));
    const Vr = Math.round(V);
    table.add({ t: T, V: Vr, p, pv: p * Vr });
    update(); A.success();
    Q.toast('Жазылды: V = ' + Vr + ' мл, p = ' + Q.fmt(p, 1) + ' кПа');
  }
  $('btnRec').addEventListener('click', record);
  $('btnClear').addEventListener('click', () => { table.clear(); update(); A.click(); });
  $('btnCsv').addEventListener('click', () => { if (!table.rows.length) return Q.toast('Кесте бос'); table.csv('boyle-mariott'); A.pop(); });
  $('btnAuto').addEventListener('click', () => {
    if (auto) return;
    auto = { list: [100, 90, 80, 70, 60, 50, 40, 30], i: 0, wait: 0, cur: V };
    $('btnAuto').disabled = true; $('btnRec').disabled = true;
    setLive(true, 'Автоматты серия');
  });
  function setLive(on, t) { $('live').classList.toggle('off', !on); $('liveTxt').textContent = t; }

  // поршеньді тышқанмен жылжыту
  const cv = $('cv');
  cv.addEventListener('pointerdown', (e) => {
    const p = c.toLocal(e);
    if (p.x > X0 - 20 && p.x < X1 + 20 && p.y < top() + 30 && !auto) { drag = true; cv.setPointerCapture(e.pointerId); A.click(); setV(p.y); }
  });
  cv.addEventListener('pointermove', (e) => {
    const p = c.toLocal(e);
    cv.style.cursor = drag ? 'grabbing' : (p.x > X0 - 20 && p.x < X1 + 20 && Math.abs(p.y - top()) < 40) ? 'ns-resize' : 'default';
    if (drag) setV(p.y);
  });
  const up = () => { drag = false; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  function setV(y) {
    const v = Q.clamp(Math.round((BOT - y) / PXML), 20, 100);
    if (v !== V) { V = v; vSlider.value = v; vSlider.dispatchEvent(new Event('input')); }
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.04); last = now;
    // автоматты серия
    if (auto) {
      const target = auto.list[auto.i];
      if (Math.abs(auto.cur - target) > 0.01) { auto.cur += Math.sign(target - auto.cur) * Math.min(40 * dt, Math.abs(target - auto.cur)); vSlider.value = auto.cur; vSlider.dispatchEvent(new Event('input')); V = auto.cur; auto.wait = 0; }
      else { V = target; vSlider.value = target; auto.wait += dt; if (auto.wait > 0.8) { record(); auto.i++; auto.wait = 0; if (auto.i >= auto.list.length) { auto = null; $('btnAuto').disabled = false; $('btnRec').disabled = false; setLive(false, 'Серия аяқталды'); } } }
    }
    const prevTop = top();
    Vshow += (V - Vshow) * Math.min(1, dt * 8);
    const tp = top(), pistonV = (tp - prevTop) / dt; // px/s
    const speed = 230 * Math.sqrt(T / 293);
    parts.forEach((p, i) => {
      // термостат: жылдамдықты бірте-бірте қалпына келтіру
      const s = Math.hypot(p.vx, p.vy) || 1, ts = speed * (0.75 + (i % 7) * 0.08);
      const ns = s + (ts - s) * Math.min(1, dt * 2);
      p.vx *= ns / s; p.vy *= ns / s;
      if (Math.abs(p.vx) < 1 && Math.abs(p.vy) < 1) { p.vx = ts; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < X0 + 6) { p.x = X0 + 6; p.vx = Math.abs(p.vx); }
      if (p.x > X1 - 6) { p.x = X1 - 6; p.vx = -Math.abs(p.vx); }
      if (p.y > BOT - 6) { p.y = BOT - 6; p.vy = -Math.abs(p.vy); }
      if (p.y < tp + 6) {
        p.y = tp + 6; p.vy = Math.abs(p.vy) + Math.max(0, pistonV) * 0.6;
        hits++;
        if (now - lastHitSnd > 70 && !auto) { A.tone(2200 + Math.random() * 600, 0.015, 'square', 0.025); lastHitSnd = now; }
        p.hit = 1;
      }
      p.hit = (p.hit || 0) * 0.9;
      if (i === 0 && trailOn) { p.tr.push({ x: p.x, y: p.y }); if (p.tr.length > 60) p.tr.shift(); }
    });
    hitT += dt;
    if (hitT > 0.5) { hitRate = hitRate * 0.5 + (hits / hitT) * 0.5; hits = 0; hitT = 0; }
    pShow += (pTrue() * (1 + Q.gauss(0.002)) - pShow) * Math.min(1, dt * 5);
    draw(tp);
    $('roV').textContent = Math.round(V) + ' мл';
    $('roP').textContent = Q.fmt(pShow, 1) + ' кПа';
    $('roT').textContent = Math.round(T - 273) + ' °C';
    $('roHits').textContent = Math.round(hitRate * 12); // 70 молекула ≈ көптеген молекулалардың үлгісі
    requestAnimationFrame(frame);
  }

  function draw(tp) {
    c.clearRect(0, 0, 1000, 625);
    c.fillStyle = '#F6F7FF'; c.fillRect(0, 0, 1000, 625);
    Q.grid(c, 25);
    // термостат суы
    const hot = (T - 273) / 80;
    c.fillStyle = 'rgba(' + Math.round(27 + 200 * hot) + ',' + Math.round(43 + 30 * (1 - hot)) + ',' + Math.round(255 - 180 * hot) + ',.12)';
    Q.roundRect(c, X0 - 40, 90, X1 - X0 + 80, BOT - 70, 20); c.fill();
    Q.text(c, 'ТЕРМОСТАТ', X0 - 28, 112, { size: 11, weight: 800, color: '#555' });
    // цилиндр
    c.fillStyle = '#FFFFFF'; c.fillRect(X0, tp, X1 - X0, BOT - tp);
    c.strokeStyle = '#0A0A0A'; c.lineWidth = 5;
    c.beginPath(); c.moveTo(X0, 110); c.lineTo(X0, BOT); c.lineTo(X1, BOT); c.lineTo(X1, 110); c.stroke();
    // шкала
    for (let v = 20; v <= 100; v += 10) {
      const y = BOT - v * PXML;
      c.lineWidth = 2; c.beginPath(); c.moveTo(X1, y); c.lineTo(X1 + 14, y); c.stroke();
      Q.text(c, v + '', X1 + 20, y + 5, { size: 12, mono: true });
    }
    Q.text(c, 'мл', X1 + 20, BOT - 100 * PXML - 16, { size: 12, mono: true, color: '#555' });
    // із
    const p0 = parts[0];
    if (trailOn && p0.tr.length > 1) {
      c.strokeStyle = 'rgba(229,72,77,.6)'; c.lineWidth = 2; c.beginPath();
      p0.tr.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y))); c.stroke();
    }
    // молекулалар
    parts.forEach((p, i) => {
      c.fillStyle = i === 0 && trailOn ? '#E5484D' : '#1B2BFF';
      c.beginPath(); c.arc(p.x, p.y, 6 + p.hit * 3, 0, Math.PI * 2); c.fill();
    });
    // поршень
    c.fillStyle = '#0A0A0A'; c.fillRect(X0 + 3, tp - 22, X1 - X0 - 6, 22);
    c.fillStyle = '#E8FF47'; c.fillRect(X0 + 3, tp - 6, X1 - X0 - 6, 4);
    c.fillStyle = '#0A0A0A'; c.fillRect((X0 + X1) / 2 - 7, 40, 14, tp - 62);
    c.fillStyle = drag ? '#1B2BFF' : '#E8FF47'; c.strokeStyle = '#0A0A0A'; c.lineWidth = 4;
    Q.roundRect(c, (X0 + X1) / 2 - 70, 22, 140, 34, 17); c.fill(); c.stroke();
    Q.text(c, '↕', (X0 + X1) / 2, 46, { size: 18, weight: 900, align: 'center', color: drag ? '#fff' : '#0A0A0A' });
    // түтік манометрге
    c.strokeStyle = '#0A0A0A'; c.lineWidth = 8;
    c.beginPath(); c.moveTo(X1, BOT - 40); c.lineTo(760, BOT - 40); c.lineTo(760, 410); c.stroke();
    // манометр
    const mx = 800, my = 290, mr = 125;
    c.fillStyle = '#fff'; c.strokeStyle = '#0A0A0A'; c.lineWidth = 6;
    c.beginPath(); c.arc(mx, my, mr, 0, Math.PI * 2); c.fill(); c.stroke();
    const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, pmax = 600;
    c.strokeStyle = '#E5484D'; c.lineWidth = 10;
    c.beginPath(); c.arc(mx, my, mr - 18, a0 + (a1 - a0) * 500 / pmax, a1); c.stroke();
    for (let p = 0; p <= pmax; p += 20) {
      const a = a0 + (a1 - a0) * p / pmax, big = p % 100 === 0;
      c.strokeStyle = '#0A0A0A'; c.lineWidth = big ? 3 : 1.2;
      c.beginPath(); c.moveTo(mx + Math.cos(a) * (mr - 10), my + Math.sin(a) * (mr - 10)); c.lineTo(mx + Math.cos(a) * (mr - (big ? 28 : 20)), my + Math.sin(a) * (mr - (big ? 28 : 20))); c.stroke();
      if (big) Q.text(c, p + '', mx + Math.cos(a) * (mr - 46), my + Math.sin(a) * (mr - 46) + 5, { size: 13, mono: true, align: 'center' });
    }
    const na = a0 + (a1 - a0) * Q.clamp(pShow, 0, pmax) / pmax;
    c.strokeStyle = '#1B2BFF'; c.lineWidth = 5;
    c.beginPath(); c.moveTo(mx - Math.cos(na) * 18, my - Math.sin(na) * 18); c.lineTo(mx + Math.cos(na) * (mr - 24), my + Math.sin(na) * (mr - 24)); c.stroke();
    c.fillStyle = '#0A0A0A'; c.beginPath(); c.arc(mx, my, 10, 0, Math.PI * 2); c.fill();
    Q.text(c, 'кПа', mx, my + 48, { size: 14, weight: 800, align: 'center' });
    Q.text(c, Q.fmt(pShow, 1), mx, my + 80, { size: 22, mono: true, align: 'center', color: '#1B2BFF' });
    Q.text(c, 'МАНОМЕТР', mx, my - mr - 18, { size: 12, weight: 800, align: 'center' });
    // термометр
    const tx = 150, tyTop = 150, tyBot = 520;
    c.fillStyle = '#fff'; c.strokeStyle = '#0A0A0A'; c.lineWidth = 4;
    Q.roundRect(c, tx - 14, tyTop, 28, tyBot - tyTop, 14); c.fill(); c.stroke();
    c.beginPath(); c.arc(tx, tyBot + 18, 26, 0, Math.PI * 2); c.fill(); c.stroke();
    const lvl = tyBot - (T - 263) / 100 * (tyBot - tyTop - 20);
    c.fillStyle = '#E5484D'; c.fillRect(tx - 6, lvl, 12, tyBot - lvl + 10);
    c.beginPath(); c.arc(tx, tyBot + 18, 19, 0, Math.PI * 2); c.fill();
    for (let t = 0; t <= 80; t += 20) {
      const y = tyBot - (t + 10) / 100 * (tyBot - tyTop - 20);
      c.strokeStyle = '#0A0A0A'; c.lineWidth = 2; c.beginPath(); c.moveTo(tx + 14, y); c.lineTo(tx + 26, y); c.stroke();
      Q.text(c, t + '°', tx + 32, y + 5, { size: 12, mono: true });
    }
  }
  requestAnimationFrame(frame);
})();
