/* 01 · Математикалық маятник */
(function () {
  'use strict';
  const A = Q.audio, $ = (id) => document.getElementById(id);
  const c = Q.canvas($('cv'), 1000, 625);
  const PX = 470, PY = 52, SCALE = 255; // пиксель / метр

  const planets = { '9.81': 'Жер', '1.62': 'Ай', '3.71': 'Марс', '24.79': 'Юпитер' };
  let L = 1, a0 = 10 * Math.PI / 180, g = 9.81, planet = 'Жер';
  let th = 0, w = 0, running = false, drag = false;
  let N = 10, damp = false, showVec = true, slow = false;
  let trail = [];
  // өлшеу
  let meas = null; // {state:'wait'|'run', t, crossings, lastSign}
  let simT = 0, prevTh = 0;

  Q.range('L', (v) => Q.fmt(v, 2) + ' м', (v) => { L = v; if (!running) { th = 0; w = 0; } trail = []; cancelMeas(); });
  Q.range('A', (v) => v + '°', (v) => { a0 = v * Math.PI / 180; });
  Q.seg('planet', (v, b) => { g = parseFloat(v); planet = b.textContent; cancelMeas(); });
  Q.seg('N', (v) => { N = parseInt(v, 10); });
  $('damp').addEventListener('change', (e) => { damp = e.target.checked; A.click(); });
  $('vec').addEventListener('change', (e) => { showVec = e.target.checked; A.click(); });
  $('slow').addEventListener('change', (e) => { slow = e.target.checked; A.click(); });

  function release(angle) { th = angle; w = 0; running = true; trail = []; setLive(true, 'Тербеліп тұр'); }
  $('btnGo').addEventListener('click', () => { release(a0); A.pop(); });
  $('btnStop').addEventListener('click', () => { running = false; th = 0; w = 0; trail = []; cancelMeas(); setLive(false, 'Тоқтатылды'); A.click(); });
  $('btnMeasure').addEventListener('click', () => {
    if (!running || Math.abs(th) + Math.abs(w) < 0.02) { release(a0); }
    meas = { state: 'wait', t: 0, crossings: 0, lastSign: Math.sign(w) || 1, reaction: Q.gauss(0.06) };
    $('btnMeasure').disabled = true;
    setLive(true, 'Секундомер дайын: тепе-теңдіктен өтуді күтуде');
    A.tock();
  });
  function cancelMeas() { if (meas) { meas = null; $('btnMeasure').disabled = false; } }
  function setLive(on, t) { $('live').classList.toggle('off', !on); $('liveTxt').textContent = t; }

  // тышқанмен тарту
  const cv = $('cv');
  function bob() { return { x: PX + L * SCALE * Math.sin(th), y: PY + L * SCALE * Math.cos(th) }; }
  cv.addEventListener('pointerdown', (e) => {
    const p = c.toLocal(e), b = bob();
    if (Math.hypot(p.x - b.x, p.y - b.y) < 45) { drag = true; running = false; cancelMeas(); cv.setPointerCapture(e.pointerId); A.click(); }
  });
  cv.addEventListener('pointermove', (e) => {
    const p = c.toLocal(e), b = bob();
    cv.style.cursor = drag ? 'grabbing' : Math.hypot(p.x - b.x, p.y - b.y) < 45 ? 'grab' : 'default';
    if (!drag) return;
    th = Q.clamp(Math.atan2(p.x - PX, Math.max(p.y - PY, 5)), -1.4, 1.4); w = 0; trail = [];
  });
  const up = () => { if (drag) { drag = false; release(th); A.pop(); } };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

  // кесте мен график
  const table = Q.Table($('tbl'), [
    { key: 'planet', label: 'Орын' },
    { key: 'L', label: 'L, м', fmt: (v) => Q.fmt(v, 2) },
    { key: 'a', label: 'α₀, °', fmt: (v) => Math.round(v) },
    { key: 'N', label: 'N' },
    { key: 't', label: 't, с', fmt: (v) => Q.fmt(v, 2) },
    { key: 'T', label: 'T, с', fmt: (v) => Q.fmt(v, 3) },
    { key: 'g', label: 'g, м/с²', fmt: (v) => Q.fmt(v, 2) }
  ]);
  const chart = Q.Chart($('chart'), { xLabel: 'L, м', yLabel: 'T², с²', xmin: 0, ymin: 0, xmaxDef: 2, ymaxDef: 8 });
  function update() {
    const rows = table.rows.filter((r) => r.planet === planet);
    const xs = rows.map((r) => r.L), ys = rows.map((r) => r.T * r.T);
    const lines = [];
    let html;
    const distinct = new Set(xs.map((x) => x.toFixed(2))).size;
    if (rows.length && distinct >= 2) {
      const k = Q.linreg0(xs, ys);
      const gFit = 4 * Math.PI * Math.PI / k;
      lines.push({ f: (x) => k * x, color: '#1B2BFF' });
      lines.push({ f: (x) => 4 * Math.PI * Math.PI / g * x, color: '#0A0A0A', dash: [6, 6], width: 1.5 });
      const gs = rows.map((r) => r.g), err = Math.abs(gFit - g) / g * 100;
      html = '<b>' + planet + '</b> · графиктің еңісі k = <b>' + Q.fmt(k, 3) + ' с²/м</b><br>g = 4π²/k = <b>' + Q.fmt(gFit, 2) + ' м/с²</b> · кестедегі орташа: <b>' +
        Q.fmt(Q.mean(gs), 2) + ' ± ' + Q.fmt(Q.sd(gs), 2) + '</b><br>Анықтамалық мән: ' + Q.fmt(g, 2) + ' м/с² · салыстырмалы қателік <b>' + Q.fmt(err, 1) + '%</b>';
      if (distinct < 3) html += '<br>Дәлірек нәтиже үшін тағы бір ұзындықпен өлшеңіз.';
    } else if (rows.length) {
      html = 'Бір ұзындық бар (' + planet + '). Графиктен g табу үшін L-ді өзгертіп, тағы өлшем жасаңыз.';
    } else html = planet + ' үшін әзірге өлшем жоқ. Кемінде 3 түрлі ұзындықпен өлшем жасаңыз.';
    chart.set(rows.map((r) => ({ x: r.L, y: r.T * r.T })), lines);
    $('result').innerHTML = html;
  }
  update();
  $('btnClear').addEventListener('click', () => { table.clear(); update(); A.click(); });
  $('btnCsv').addEventListener('click', () => { if (!table.rows.length) return Q.toast('Кесте бос'); table.csv('mayatnik'); A.pop(); });

  // физика: RK4, сызықты емес теңдеу
  function acc(t, ww) { return -(g / L) * Math.sin(t) - (damp ? 0.12 : 0.004) * ww; }
  function step(h) {
    const k1t = w, k1w = acc(th, w);
    const k2t = w + k1w * h / 2, k2w = acc(th + k1t * h / 2, w + k1w * h / 2);
    const k3t = w + k2w * h / 2, k3w = acc(th + k2t * h / 2, w + k2w * h / 2);
    const k4t = w + k3w * h, k4w = acc(th + k3t * h, w + k3w * h);
    th += (k1t + 2 * k2t + 2 * k3t + k4t) * h / 6;
    w += (k1w + 2 * k2w + 2 * k3w + k4w) * h / 6;
  }

  let last = performance.now();
  function frame(now) {
    let dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (slow) dt *= 0.25;
    if (running && !drag) {
      const sub = 20, h = dt / sub;
      for (let i = 0; i < sub; i++) {
        prevTh = th; step(h); simT += h;
        // тепе-теңдік арқылы өту
        if ((prevTh < 0 && th >= 0) || (prevTh > 0 && th <= 0)) {
          const frac = Math.abs(prevTh) / (Math.abs(prevTh) + Math.abs(th) || 1);
          onCross(h * (1 - frac));
        }
        if (meas && meas.state === 'run') meas.t += h;
      }
      trail.push(bob()); if (trail.length > 50) trail.shift();
      if (Math.abs(th) < 0.002 && Math.abs(w) < 0.004) { running = false; setLive(false, 'Маятник тоқтады'); }
    }
    draw();
    readouts();
    requestAnimationFrame(frame);
  }
  function onCross(over) {
    if (Math.abs(w) > 0.05) (meas && meas.state === 'run' ? A.tick() : A.tone(1500, 0.03, 'square', 0.05));
    if (!meas) return;
    if (meas.state === 'wait') {
      meas.state = 'run'; meas.t = over; meas.crossings = 0;
      setLive(true, 'Секундомер жүріп тұр');
      return;
    }
    meas.crossings++;
    if (meas.crossings >= 2 * N) {
      const t = meas.t - over + meas.reaction + Q.gauss(0.04);
      const T = t / N;
      const row = { planet, L, a: a0 * 180 / Math.PI, N, t, T, g: 4 * Math.PI * Math.PI * L / (T * T) };
      table.add(row); update();
      meas = null; $('btnMeasure').disabled = false;
      setLive(true, 'Өлшем жазылды');
      A.success();
      Q.toast('Жазылды: ' + N + ' тербеліс — ' + Q.fmt(t, 2) + ' с, T = ' + Q.fmt(T, 3) + ' с');
    }
  }

  function readouts() {
    $('roAng').textContent = Q.fmt(th * 180 / Math.PI, 1) + '°';
    $('roV').textContent = Q.fmt(Math.abs(w) * L, 2) + ' м/с';
    $('roN').textContent = meas && meas.state === 'run' ? Math.floor(meas.crossings / 2) + ' / ' + N : meas ? '0 / ' + N : '—';
    $('roT').textContent = meas && meas.state === 'run' ? Q.fmt(meas.t, 2) + ' с' : table.rows.length ? Q.fmt(table.rows[table.rows.length - 1].t, 2) + ' с' : '0,00 с';
  }

  function draw() {
    c.clearRect(0, 0, 1000, 625);
    c.fillStyle = '#F6F7FF'; c.fillRect(0, 0, 1000, 625);
    Q.grid(c, 25);
    // планета белгісі
    Q.text(c, planet.toUpperCase(), 24, 40, { size: 15, weight: 900, color: '#1B2BFF' });
    Q.text(c, 'g = ? (өлшеп табыңыз)', 24, 62, { size: 12, mono: true, color: '#555' });
    // штатив
    c.fillStyle = '#0A0A0A'; c.fillRect(PX - 120, PY - 22, 240, 14);
    c.fillRect(PX - 4, PY - 10, 8, 10);
    // сызғыш (жіп ұзындығы)
    const rx = 860;
    c.fillStyle = '#E8FF47'; c.fillRect(rx, PY, 36, 2.0 * SCALE);
    c.strokeStyle = '#0A0A0A'; c.lineWidth = 2; c.strokeRect(rx, PY, 36, 2.0 * SCALE);
    for (let i = 0; i <= 40; i++) {
      const y = PY + i * 0.05 * SCALE, big = i % 4 === 0;
      c.beginPath(); c.moveTo(rx, y); c.lineTo(rx + (big ? 18 : 9), y); c.lineWidth = big ? 2 : 1; c.stroke();
      if (big) Q.text(c, Q.fmt(i * 0.05, 1), rx + 42, y + 4, { size: 11, mono: true });
    }
    c.strokeStyle = '#1B2BFF'; c.lineWidth = 2; c.setLineDash([5, 5]);
    c.beginPath(); c.moveTo(rx - 10, PY + L * SCALE); c.lineTo(rx + 36, PY + L * SCALE); c.stroke(); c.setLineDash([]);
    Q.text(c, 'L', rx - 26, PY + L * SCALE + 5, { size: 14, color: '#1B2BFF', weight: 900 });
    // бұрыш өлшегіш
    const R = 90;
    c.strokeStyle = 'rgba(10,10,10,.35)'; c.lineWidth = 1;
    c.beginPath(); c.arc(PX, PY, R, Math.PI / 2 - 1.05, Math.PI / 2 + 1.05); c.stroke();
    for (let d = -60; d <= 60; d += 10) {
      const r = d * Math.PI / 180;
      c.beginPath(); c.moveTo(PX + R * Math.sin(r), PY + R * Math.cos(r)); c.lineTo(PX + (R + (d % 30 === 0 ? 12 : 6)) * Math.sin(r), PY + (R + (d % 30 === 0 ? 12 : 6)) * Math.cos(r)); c.stroke();
      if (d % 30 === 0) Q.text(c, Math.abs(d) + '°', PX + (R + 26) * Math.sin(r), PY + (R + 26) * Math.cos(r) + 4, { size: 10, mono: true, align: 'center', color: '#555' });
    }
    // вертикаль
    c.setLineDash([4, 6]); c.strokeStyle = 'rgba(10,10,10,.3)';
    c.beginPath(); c.moveTo(PX, PY); c.lineTo(PX, PY + L * SCALE + 30); c.stroke(); c.setLineDash([]);
    // бұрыш доғасы
    if (Math.abs(th) > 0.01) {
      c.strokeStyle = '#E5484D'; c.lineWidth = 3;
      c.beginPath();
      th > 0 ? c.arc(PX, PY, 55, Math.PI / 2 - th, Math.PI / 2) : c.arc(PX, PY, 55, Math.PI / 2, Math.PI / 2 - th);
      c.stroke();
      Q.text(c, 'α', PX + 66 * Math.sin(th / 2), PY + 66 * Math.cos(th / 2) + 5, { size: 15, color: '#E5484D', weight: 900, align: 'center' });
    }
    // із
    trail.forEach((p, i) => { c.fillStyle = 'rgba(27,43,255,' + (i / trail.length * 0.35) + ')'; c.beginPath(); c.arc(p.x, p.y, 4 + i / trail.length * 8, 0, Math.PI * 2); c.fill(); });
    // жіп және шар
    const b = bob();
    c.strokeStyle = '#0A0A0A'; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(PX, PY); c.lineTo(b.x, b.y); c.stroke();
    c.fillStyle = '#0A0A0A'; c.beginPath(); c.arc(b.x, b.y, 24, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#E8FF47'; c.beginPath(); c.arc(b.x - 8, b.y - 8, 6, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#1B2BFF'; c.strokeStyle = '#0A0A0A'; c.lineWidth = 3; c.beginPath(); c.arc(PX, PY, 6, 0, Math.PI * 2); c.fill(); c.stroke();
    // жылдамдық векторы
    if (showVec && Math.abs(w) > 0.02) {
      const v = w * L, len = Q.clamp(v * 45, -160, 160);
      const ux = Math.cos(th), uy = -Math.sin(th);
      arrow(b.x, b.y, b.x + ux * len, b.y + uy * len, '#1B2BFF', 'v');
    }
    // энергия бағандары
    const h = L * (1 - Math.cos(th)), v2 = (w * L) * (w * L);
    const Ep = g * h, Ek = v2 / 2, Emax = Math.max(g * L * (1 - Math.cos(Math.max(a0, Math.abs(th)))), Ep + Ek, 1e-6);
    const bx = 40, by = 560, bh = 380;
    Q.text(c, 'ЭНЕРГИЯ', bx, by - bh - 22, { size: 12, weight: 800 });
    bar(bx, by, bh, Ek / Emax, '#1B2BFF', 'Eк');
    bar(bx + 50, by, bh, Ep / Emax, '#E8FF47', 'Eп');
    // секундомер
    if (meas) {
      c.fillStyle = '#0A0A0A'; Q.roundRect(c, 620, 560, 210, 48, 24); c.fill();
      Q.text(c, (meas.state === 'run' ? '⏱ ' + Q.fmt(meas.t, 2) + ' с' : '⏱ күту…'), 645, 592, { mono: true, size: 18, color: '#E8FF47' });
      Q.text(c, Math.floor(meas.crossings / 2) + '/' + N, 810, 592, { mono: true, size: 14, color: '#fff', align: 'right' });
    }
  }
  function bar(x, y, h, f, col, lab) {
    f = Q.clamp(f, 0, 1);
    c.strokeStyle = '#0A0A0A'; c.lineWidth = 2; c.strokeRect(x, y - h, 32, h);
    c.fillStyle = col; c.fillRect(x + 2, y - h * f + (f ? 0 : 0), 28, h * f - 2 > 0 ? h * f - 2 : 0);
    Q.text(c, lab, x + 16, y + 20, { size: 13, weight: 800, align: 'center' });
  }
  function arrow(x1, y1, x2, y2, col, lab) {
    const a = Math.atan2(y2 - y1, x2 - x1);
    c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 4;
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2 - 10 * Math.cos(a), y2 - 10 * Math.sin(a)); c.stroke();
    c.beginPath(); c.moveTo(x2, y2); c.lineTo(x2 - 16 * Math.cos(a - 0.4), y2 - 16 * Math.sin(a - 0.4)); c.lineTo(x2 - 16 * Math.cos(a + 0.4), y2 - 16 * Math.sin(a + 0.4)); c.fill();
    Q.text(c, lab, x2 + 10 * Math.cos(a), y2 + 10 * Math.sin(a) - 6, { size: 15, weight: 900, color: col });
  }
  requestAnimationFrame(frame);
})();
