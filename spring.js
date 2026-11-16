/* 04 · Серіппелі маятник */
(function () {
  'use strict';
  const A = Q.audio, $ = (id) => document.getElementById(id);
  const c = Q.canvas($('cv'), 1000, 625);
  let ready = false;
  const SX = 380, TOP = 46, S = 500, L0 = 0.22, G = 9.81;
  let m = 0.2, k = 25, kName = 'Орташа Б', amp = 0.05, damp = false, showGraph = true, N = 10;
  let x = 0, v = 0, running = false, drag = false, x0show = m * G / k;
  let meas = null, hist = [], prevV = 0;

  Q.range('m', (val) => Math.round(val) + ' г', (val) => { m = val / 1000; cancelMeas(); });
  Q.seg('k', (val, b) => { k = parseFloat(val); kName = b.textContent; cancelMeas(); if (ready) update(); });
  Q.range('amp', (val) => Q.fmt(val, 1) + ' см', (val) => { amp = val / 100; });
  Q.seg('N', (val) => { N = parseInt(val, 10); });
  $('damp').addEventListener('change', (e) => { damp = e.target.checked; A.click(); });
  $('graph').addEventListener('change', (e) => { showGraph = e.target.checked; A.click(); });
  function setLive(on, t) { $('live').classList.toggle('off', !on); $('liveTxt').textContent = t; }
  function release(d) { x = d; v = 0; running = true; setLive(true, 'Тербеліп тұр'); }
  $('btnGo').addEventListener('click', () => { release(amp); A.pop(); });
  $('btnStop').addEventListener('click', () => { running = false; x = 0; v = 0; cancelMeas(); setLive(false, 'Тоқтатылды'); A.click(); });
  $('btnMeasure').addEventListener('click', () => {
    if (!running || Math.abs(x) < 0.003) release(amp);
    meas = { state: 'wait', t: 0, cr: 0, reaction: Q.gauss(0.06) };
    $('btnMeasure').disabled = true; setLive(true, 'Секундомер дайын'); A.tock();
  });
  function cancelMeas() { if (meas) { meas = null; $('btnMeasure').disabled = false; } }

  const blockH = () => 26 + m * 90, blockW = () => 60 + m * 60;
  const bottomY = () => TOP + (L0 + x0show + x) * S;
  const cv = $('cv');
  cv.addEventListener('pointerdown', (e) => {
    const p = c.toLocal(e), by = bottomY();
    if (Math.abs(p.x - SX) < blockW() / 2 + 20 && p.y > by - 10 && p.y < by + blockH() + 20) { drag = true; running = false; cancelMeas(); cv.setPointerCapture(e.pointerId); A.click(); }
  });
  cv.addEventListener('pointermove', (e) => {
    const p = c.toLocal(e), by = bottomY();
    cv.style.cursor = drag ? 'grabbing' : (Math.abs(p.x - SX) < blockW() / 2 + 20 && p.y > by - 10 && p.y < by + blockH() + 20) ? 'grab' : 'default';
    if (drag) x = Q.clamp((p.y - blockH() / 2 - TOP) / S - L0 - x0show, -0.08, 0.15);
  });
  const up = () => { if (drag) { drag = false; release(x); A.pop(); } };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

  const table = Q.Table($('tbl'), [
    { key: 'spring', label: 'Серіппе' },
    { key: 'm', label: 'm, г', fmt: (val) => Math.round(val * 1000) },
    { key: 'N', label: 'N' },
    { key: 't', label: 't, с', fmt: (val) => Q.fmt(val, 2) },
    { key: 'T', label: 'T, с', fmt: (val) => Q.fmt(val, 3) },
    { key: 'k', label: 'k, Н/м', fmt: (val) => Q.fmt(val, 1) }
  ]);
  const chart = Q.Chart($('chart'), { xLabel: 'm, кг', yLabel: 'T², с²', xmin: 0, ymin: 0, xmaxDef: 0.5, ymaxDef: 1.5 });
  function update() {
    const rows = table.rows.filter((r) => r.spring === kName);
    const lines = []; let html;
    const distinct = new Set(rows.map((r) => r.m.toFixed(3))).size;
    if (distinct >= 2) {
      const sl = Q.linreg0(rows.map((r) => r.m), rows.map((r) => r.T * r.T)), kFit = 4 * Math.PI * Math.PI / sl;
      lines.push({ f: (z) => sl * z, color: '#1B2BFF' });
      const ks = rows.map((r) => r.k);
      html = '<b>' + kName + '</b> · еңіс ' + Q.fmt(sl, 3) + ' с²/кг → k = 4π²/еңіс = <b>' + Q.fmt(kFit, 1) + ' Н/м</b><br>Кестедегі орташа: <b>' + Q.fmt(Q.mean(ks), 1) + ' ± ' + Q.fmt(Q.sd(ks), 1) + ' Н/м</b>' +
        '<br>Статикалық тексеру: x₀ = mg/k → сызғыштан ұзаруды оқып, салыстырыңыз.';
    } else html = rows.length ? 'Массаны өзгертіп, тағы өлшем жасаңыз (' + kName + ').' : kName + ' үшін әзірге өлшем жоқ. Әртүрлі массамен кемінде 3 өлшем жасаңыз.';
    chart.set(rows.map((r) => ({ x: r.m, y: r.T * r.T })), lines);
    $('result').innerHTML = html;
  }
  ready = true;
  update();
  $('btnClear').addEventListener('click', () => { table.clear(); update(); A.click(); });
  $('btnCsv').addEventListener('click', () => { if (!table.rows.length) return Q.toast('Кесте бос'); table.csv('serippe'); A.pop(); });

  function onCross(over) {
    if (meas && meas.state === 'run') A.tick();
    if (!meas) return;
    if (meas.state === 'wait') { meas.state = 'run'; meas.t = over; meas.cr = 0; setLive(true, 'Секундомер жүріп тұр'); return; }
    meas.cr++;
    if (meas.cr >= 2 * N) {
      const t = meas.t - over + meas.reaction + Q.gauss(0.04), T = t / N;
      table.add({ spring: kName, m, N, t, T, k: 4 * Math.PI * Math.PI * m / (T * T) });
      update(); meas = null; $('btnMeasure').disabled = false; setLive(true, 'Өлшем жазылды'); A.success();
      Q.toast('Жазылды: ' + N + ' тербеліс — ' + Q.fmt(t, 2) + ' с, T = ' + Q.fmt(T, 3) + ' с');
    }
  }

  let last = performance.now(), gT = 0;
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.04); last = now;
    x0show += (m * G / k - x0show) * Math.min(1, dt * 6);
    if (running && !drag) {
      const sub = 20, h = dt / sub, b = damp ? 0.9 : 0.01;
      for (let i = 0; i < sub; i++) {
        const px = x;
        prevV = v;
        v += (-(k / m) * x - b * v / m * m) * h; x += v * h;
        if ((px < 0 && x >= 0) || (px > 0 && x <= 0)) { const f = Math.abs(px) / (Math.abs(px) + Math.abs(x) || 1); onCross(h * (1 - f)); }
        if (prevV > 0 && v <= 0 && x > 0.004) A.tone(170 + 30 * Math.random(), 0.22, 'sine', Q.clamp(x * 3, 0.03, 0.18), 260);
        if (meas && meas.state === 'run') meas.t += h;
      }
      if (Math.abs(x) < 0.0005 && Math.abs(v) < 0.002) { running = false; x = 0; v = 0; setLive(false, 'Жүк тоқтады'); }
    }
    gT += dt;
    hist.push({ t: gT, x }); while (hist.length && gT - hist[0].t > 6) hist.shift();
    draw();
    $('roX').textContent = Q.fmt(x * 100, 1) + ' см';
    $('roX0').textContent = Q.fmt(x0show * 100, 1) + ' см';
    $('roN').textContent = meas && meas.state === 'run' ? Math.floor(meas.cr / 2) + ' / ' + N : meas ? '0 / ' + N : '—';
    $('roT').textContent = meas && meas.state === 'run' ? Q.fmt(meas.t, 2) + ' с' : table.rows.length ? Q.fmt(table.rows[table.rows.length - 1].t, 2) + ' с' : '0,00 с';
    requestAnimationFrame(frame);
  }

  function draw() {
    c.clearRect(0, 0, 1000, 625);
    c.fillStyle = '#F6F7FF'; c.fillRect(0, 0, 1000, 625);
    Q.grid(c, 25);
    // штатив
    c.fillStyle = '#0A0A0A'; c.fillRect(SX - 130, TOP - 20, 260, 16); c.fillRect(SX - 3, TOP - 6, 6, 6);
    // сызғыш
    const rx = SX - 170;
    c.fillStyle = '#E8FF47'; c.fillRect(rx, TOP, 40, 1.0 * S); c.strokeStyle = '#0A0A0A'; c.lineWidth = 2; c.strokeRect(rx, TOP, 40, 1.0 * S);
    for (let i = 0; i <= 100; i += 2) {
      const y = TOP + i / 100 * S, big = i % 10 === 0;
      c.lineWidth = big ? 2 : 1; c.beginPath(); c.moveTo(rx + 40, y); c.lineTo(rx + 40 - (big ? 18 : 8), y); c.stroke();
      if (big) Q.text(c, String(i), rx - 6, y + 4, { size: 11, mono: true, align: 'right' });
    }
    Q.text(c, 'см', rx - 6, TOP - 10, { size: 11, mono: true, align: 'right', color: '#555' });
    // бос ұзындық және тепе-теңдік белгілері
    const yFree = TOP + L0 * S, yEq = TOP + (L0 + x0show) * S;
    c.setLineDash([6, 6]); c.lineWidth = 2;
    c.strokeStyle = '#888'; c.beginPath(); c.moveTo(rx + 40, yFree); c.lineTo(SX + 120, yFree); c.stroke();
    c.strokeStyle = '#1B2BFF'; c.beginPath(); c.moveTo(rx + 40, yEq + blockH() / 2); c.lineTo(SX + 120, yEq + blockH() / 2); c.stroke();
    c.setLineDash([]);
    Q.text(c, 'бос күй', SX + 126, yFree + 4, { size: 11, weight: 700, color: '#666' });
    Q.text(c, 'тепе-теңдік', SX + 126, yEq + blockH() / 2 + 4, { size: 11, weight: 700, color: '#1B2BFF' });
    // x₀ көрсеткіш
    c.strokeStyle = '#1B2BFF'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(SX + 100, yFree); c.lineTo(SX + 100, yEq); c.stroke();
    Q.text(c, 'x₀', SX + 106, (yFree + yEq) / 2 + 4, { size: 13, weight: 900, color: '#1B2BFF' });
    // серіппе
    const by = bottomY(), coils = 18, wdt = 26 + 8 * (25 / k);
    c.strokeStyle = '#0A0A0A'; c.lineWidth = k > 30 ? 4 : k < 20 ? 2 : 3; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(SX, TOP); c.lineTo(SX, TOP + 12);
    const span = by - TOP - 24;
    for (let i = 0; i < coils; i++) c.lineTo(SX + (i % 2 ? -wdt : wdt) / 2 * 1.4, TOP + 12 + span * (i + 0.5) / coils);
    c.lineTo(SX, by - 12); c.lineTo(SX, by); c.stroke();
    // жүк
    const bw = blockW(), bh = blockH();
    c.fillStyle = drag ? '#1B2BFF' : '#0A0A0A';
    Q.roundRect(c, SX - bw / 2, by, bw, bh, 8); c.fill();
    c.fillStyle = '#E8FF47'; Q.text(c, Math.round(m * 1000) + ' г', SX, by + bh / 2 + 6, { size: 15, mono: true, align: 'center', color: '#E8FF47' });
    // серпімділік күші
    const F = k * (x0show + x);
    if (Math.abs(F) > 0.05) {
      const len = Q.clamp(F * 12, -120, 120);
      c.strokeStyle = '#E5484D'; c.fillStyle = '#E5484D'; c.lineWidth = 4;
      const ax = SX - bw / 2 - 24;
      c.beginPath(); c.moveTo(ax, by + bh / 2); c.lineTo(ax, by + bh / 2 - len); c.stroke();
      c.beginPath(); c.moveTo(ax, by + bh / 2 - len - (len > 0 ? 12 : -12)); c.lineTo(ax - 8, by + bh / 2 - len); c.lineTo(ax + 8, by + bh / 2 - len); c.fill();
      Q.text(c, 'F', ax - 18, by + bh / 2 - len / 2, { size: 14, weight: 900, color: '#E5484D' });
    }
    // x(t) графигі
    if (showGraph) {
      const gx = 600, gy = 70, gw = 370, gh = 250, mid = gy + gh / 2;
      c.fillStyle = '#fff'; c.strokeStyle = '#0A0A0A'; c.lineWidth = 2;
      Q.roundRect(c, gx, gy, gw, gh, 14); c.fill(); c.stroke();
      c.strokeStyle = '#DDD'; c.lineWidth = 1; c.beginPath(); c.moveTo(gx, mid); c.lineTo(gx + gw, mid); c.stroke();
      for (let s = 1; s < 6; s++) { c.beginPath(); c.moveTo(gx + gw * s / 6, gy); c.lineTo(gx + gw * s / 6, gy + gh); c.stroke(); }
      Q.text(c, 'x(t)', gx + 12, gy + 22, { size: 13, weight: 900 });
      Q.text(c, '1 бөлік = 1 с', gx + gw - 12, gy + gh - 10, { size: 10, mono: true, align: 'right', color: '#666' });
      if (hist.length > 1) {
        const t1 = hist[hist.length - 1].t;
        c.save(); c.beginPath(); c.rect(gx, gy, gw, gh); c.clip();
        c.strokeStyle = '#1B2BFF'; c.lineWidth = 3; c.beginPath();
        hist.forEach((p, i) => { const X = gx + gw - (t1 - p.t) / 6 * gw, Y = mid + p.x * 700; i ? c.lineTo(X, Y) : c.moveTo(X, Y); });
        c.stroke(); c.restore();
      }
    }
    if (meas) {
      c.fillStyle = '#0A0A0A'; Q.roundRect(c, 600, 540, 230, 48, 24); c.fill();
      Q.text(c, meas.state === 'run' ? '⏱ ' + Q.fmt(meas.t, 2) + ' с' : '⏱ күту…', 625, 572, { mono: true, size: 18, color: '#E8FF47' });
      Q.text(c, Math.floor(meas.cr / 2) + '/' + N, 812, 572, { mono: true, size: 14, color: '#fff', align: 'right' });
    }
  }
  requestAnimationFrame(frame);
})();
