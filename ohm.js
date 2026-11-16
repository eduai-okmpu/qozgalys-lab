/* 03 · Ом заңы */
(function () {
  'use strict';
  const A = Q.audio, $ = (id) => document.getElementById(id);
  const c = Q.canvas($('cv'), 1000, 625);
  let ready = false;
  const names = { '4.7': 'R₁', '10': 'R₂', '22': 'R₃' };
  const rInt = 0.3, FUSE = 1.5;
  let E = 3, R = 10, Rname = 'R₂', on = false, fuseOk = true, flow = true;
  let I = 0, Ushow = 0, needleA = 0, needleV = 0, needleAv = 0, needleVv = 0, over = 0, heat = 0;
  let hum = null, sparks = [], phase = 0;

  Q.range('U', (v) => Q.fmt(v, 1) + ' В', (v) => { E = v; });
  Q.seg('R', (v, b) => { R = parseFloat(v); Rname = b.textContent; if (ready) update(); });
  $('flow').addEventListener('change', (e) => { flow = e.target.checked; A.click(); });
  function setKey(v) {
    on = v; A.click(); if (on && fuseOk && E > 0.5) A.spark();
    $('btnKey').textContent = on ? 'Кілтті ажырату' : 'Кілтті қосу';
    $('btnKey').classList.toggle('yel', !on); $('btnKey').classList.toggle('solid', on);
    if (on && !hum) hum = A.hum('sawtooth');
    setLive(on && fuseOk, on ? (fuseOk ? 'Тізбек тұйық' : 'Сақтандырғыш күйген') : 'Тізбек ажыратулы');
  }
  $('btnKey').addEventListener('click', () => setKey(!on));
  $('btnFuse').addEventListener('click', () => {
    if (fuseOk) return Q.toast('Сақтандырғыш бүтін');
    fuseOk = true; over = 0; A.pop(); Q.toast('Жаңа сақтандырғыш (1,5 А) орнатылды');
    setLive(on, on ? 'Тізбек тұйық' : 'Тізбек ажыратулы');
  });
  function setLive(o, t) { $('live').classList.toggle('off', !o); $('liveTxt').textContent = t; }

  const cv = $('cv');
  cv.addEventListener('pointerdown', (e) => { const p = c.toLocal(e); if (Math.abs(p.x - 270) < 60 && Math.abs(p.y - 120) < 50) setKey(!on); });
  cv.addEventListener('pointermove', (e) => { const p = c.toLocal(e); cv.style.cursor = Math.abs(p.x - 270) < 60 && Math.abs(p.y - 120) < 50 ? 'pointer' : 'default'; });

  // кесте мен график
  const table = Q.Table($('tbl'), [
    { key: 'name', label: 'Резистор' },
    { key: 'U', label: 'U, В', fmt: (v) => Q.fmt(v, 2) },
    { key: 'I', label: 'I, А', fmt: (v) => Q.fmt(v, 3) },
    { key: 'R', label: 'R = U/I, Ом', fmt: (v) => Q.fmt(v, 2) }
  ]);
  const chart = Q.Chart($('chart'), { xLabel: 'U, В', yLabel: 'I, А', xmin: 0, ymin: 0, xmaxDef: 12, ymaxDef: 1.5 });
  function update() {
    const rows = table.rows.filter((r) => r.name === Rname);
    const lines = [];
    let html = '';
    ['R₁', 'R₂', 'R₃'].forEach((n) => {
      const rs = table.rows.filter((r) => r.name === n && r.U > 0.2);
      if (rs.length < 2) return;
      const k = Q.linreg0(rs.map((r) => r.U), rs.map((r) => r.I));
      if (n === Rname) lines.push({ f: (x) => k * x, color: '#1B2BFF' });
      else lines.push({ f: (x) => k * x, color: '#BBBBBB', width: 1.5, dash: [4, 4] });
      html += (html ? '<br>' : '') + '<b>' + n + '</b>: еңіс ' + Q.fmt(k, 4) + ' А/В → R = 1/еңіс = <b>' + Q.fmt(1 / k, 2) + ' Ом</b> (' + rs.length + ' өлшем)';
    });
    chart.set(rows.map((r) => ({ x: r.U, y: r.I })), lines);
    $('result').innerHTML = html || 'Бір резистор үшін әртүрлі кернеуде кемінде 3 өлшем жазыңыз.';
  }
  ready = true;
  update();
  $('btnRec').addEventListener('click', () => {
    if (!on) { A.error(); return Q.toast('Алдымен кілтті қосыңыз'); }
    if (!fuseOk) { A.error(); return Q.toast('Сақтандырғыш күйген — ауыстырыңыз'); }
    const Ur = Math.round(I * R * 100 + Q.gauss(1)) / 100, Ir = Math.max(0, Math.round(I * 1000 + Q.gauss(2)) / 1000);
    table.add({ name: Rname, U: Ur, I: Ir, R: Ir > 0 ? Ur / Ir : NaN });
    update(); A.success();
    Q.toast(Rname + ': U = ' + Q.fmt(Ur, 2) + ' В, I = ' + Q.fmt(Ir, 3) + ' А');
  });
  $('btnClear').addEventListener('click', () => { table.clear(); update(); A.click(); });
  $('btnCsv').addEventListener('click', () => { if (!table.rows.length) return Q.toast('Кесте бос'); table.csv('om-zany'); A.pop(); });

  // электрондар жолы
  const path = [[120, 120], [880, 120], [880, 450], [120, 450], [120, 120]];
  const segs = []; let total = 0;
  for (let i = 0; i < path.length - 1; i++) { const l = Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]); segs.push(l); total += l; }
  function at(s) {
    s = ((s % total) + total) % total;
    for (let i = 0; i < segs.length; i++) { if (s <= segs[i]) { const t = s / segs[i]; return [Q.lerp(path[i][0], path[i + 1][0], t), Q.lerp(path[i][1], path[i + 1][1], t)]; } s -= segs[i]; }
    return path[0];
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.04); last = now;
    const closed = on && fuseOk;
    I = closed ? E / (R + rInt) : 0;
    Ushow = I * R;
    if (closed && I > FUSE) {
      over += dt;
      if (over > 0.35) {
        fuseOk = false; A.boom(); setLive(false, 'Сақтандырғыш күйді!');
        Q.toast('Ток 1,5 А-ден асты — сақтандырғыш күйді!');
        for (let i = 0; i < 40; i++) sparks.push({ x: 880, y: 285, vx: (Math.random() - 0.5) * 500, vy: (Math.random() - 0.8) * 500, life: 1 });
      }
    } else over = Math.max(0, over - dt);
    // тілдер: өшетін серіппе
    const tA = I / 3, tV = Ushow / 15;
    needleAv += ((tA - needleA) * 90 - needleAv * 9) * dt; needleA += needleAv * dt;
    needleVv += ((tV - needleV) * 90 - needleVv * 9) * dt; needleV += needleVv * dt;
    const P = I * I * R;
    heat += (Q.clamp(P / 25, 0, 1) - heat) * dt * 1.5;
    if (hum) hum.set(60 + I * 90, closed ? Q.clamp(0.015 + I * 0.025, 0, 0.09) : 0);
    phase += I * 160 * dt;
    sparks.forEach((s) => { s.vy += 900 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt * 1.5; });
    sparks = sparks.filter((s) => s.life > 0);
    draw(closed, P);
    $('roU').textContent = Q.fmt(Ushow, 2) + ' В';
    $('roI').textContent = Q.fmt(I, 3) + ' А';
    $('roP').textContent = Q.fmt(P, 2) + ' Вт';
    $('roF').textContent = fuseOk ? (I > FUSE ? 'ҚАУІПТІ!' : 'Бүтін') : 'Күйген';
    requestAnimationFrame(frame);
  }

  function wire(x1, y1, x2, y2) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
  function meter(x, y, r, val, label, max, unit) {
    c.fillStyle = '#fff'; c.strokeStyle = '#0A0A0A'; c.lineWidth = 5;
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.stroke();
    const a0 = Math.PI * 1.15, a1 = Math.PI * 1.85;
    for (let i = 0; i <= 10; i++) {
      const a = a0 + (a1 - a0) * i / 10;
      c.lineWidth = i % 5 ? 1.2 : 2.5;
      c.beginPath(); c.moveTo(x + Math.cos(a) * (r - 8), y + Math.sin(a) * (r - 8) + 12); c.lineTo(x + Math.cos(a) * (r - (i % 5 ? 15 : 20)), y + Math.sin(a) * (r - (i % 5 ? 15 : 20)) + 12); c.stroke();
      if (i % 5 === 0) Q.text(c, Q.fmt(max * i / 10, 0).replace(',0', ''), x + Math.cos(a) * (r - 30), y + Math.sin(a) * (r - 30) + 16, { size: 10, mono: true, align: 'center' });
    }
    const a = a0 + (a1 - a0) * Q.clamp(val, -0.02, 1.05);
    c.strokeStyle = '#E5484D'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(x, y + 12); c.lineTo(x + Math.cos(a) * (r - 12), y + 12 + Math.sin(a) * (r - 12)); c.stroke();
    c.fillStyle = '#0A0A0A'; c.beginPath(); c.arc(x, y + 12, 5, 0, Math.PI * 2); c.fill();
    Q.text(c, label, x, y + r * 0.62, { size: 22, weight: 900, align: 'center' });
    Q.text(c, unit, x + r * 0.55, y + r * 0.62, { size: 11, mono: true, align: 'center', color: '#555' });
  }

  function draw(closed, P) {
    c.clearRect(0, 0, 1000, 625);
    c.fillStyle = '#F6F7FF'; c.fillRect(0, 0, 1000, 625);
    Q.grid(c, 25);
    c.lineCap = 'round';
    c.strokeStyle = closed ? '#0A0A0A' : '#555'; c.lineWidth = 5;
    // негізгі контур (компоненттер орындарын қалдырып)
    wire(120, 120, 230, 120); wire(310, 120, 445, 120); wire(555, 120, 880, 120);
    wire(880, 120, 880, 250); wire(880, 320, 880, 450);
    wire(880, 450, 590, 450); wire(410, 450, 120, 450);
    wire(120, 450, 120, 335); wire(120, 245, 120, 120);
    // вольтметр параллель
    c.lineWidth = 3; c.strokeStyle = '#1B2BFF';
    wire(390, 450, 390, 560); wire(390, 560, 445, 560); wire(555, 560, 610, 560); wire(610, 560, 610, 450);
    c.fillStyle = '#1B2BFF'; [[390, 450], [610, 450]].forEach((p) => { c.beginPath(); c.arc(p[0], p[1], 7, 0, Math.PI * 2); c.fill(); });
    // электрондар
    if (flow && closed && I > 0.001) {
      c.fillStyle = '#1B2BFF';
      const n = 46;
      for (let i = 0; i < n; i++) {
        const [x, y] = at(-phase + i * total / n);
        c.beginPath(); c.arc(x, y, 4.5, 0, Math.PI * 2); c.fill();
      }
    }
    // ток көзі
    c.fillStyle = '#0A0A0A'; Q.roundRect(c, 70, 245, 100, 90, 14); c.fill();
    Q.text(c, Q.fmt(E, 1) + ' В', 120, 285, { size: 17, mono: true, align: 'center', color: '#E8FF47' });
    Q.text(c, '+', 85, 265, { size: 16, weight: 900, color: '#fff' }); Q.text(c, '−', 145, 325, { size: 16, weight: 900, color: '#fff' });
    Q.text(c, 'ТОК КӨЗІ', 120, 318, { size: 10, weight: 800, align: 'center', color: '#BBB' });
    // кілт
    c.strokeStyle = '#0A0A0A'; c.lineWidth = 5; c.fillStyle = '#0A0A0A';
    c.beginPath(); c.arc(232, 120, 7, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(308, 120, 7, 0, Math.PI * 2); c.fill();
    const ka = on ? 0 : -0.55;
    wire(232, 120, 232 + 78 * Math.cos(ka), 120 + 78 * Math.sin(ka));
    Q.text(c, 'КІЛТ (басыңыз)', 270, 84, { size: 11, weight: 800, align: 'center', color: on ? '#1B2BFF' : '#E5484D' });
    // амперметр
    meter(500, 120, 58, needleA, 'A', 3, '0–3 А');
    // сақтандырғыш
    c.fillStyle = fuseOk ? '#fff' : '#333'; c.strokeStyle = '#0A0A0A'; c.lineWidth = 4;
    Q.roundRect(c, 862, 250, 36, 70, 8); c.fill(); c.stroke();
    if (fuseOk) { c.strokeStyle = over > 0 ? '#E5484D' : '#999'; c.lineWidth = 2; wire(880, 254, 880, 316); }
    else { c.strokeStyle = '#E5484D'; c.lineWidth = 2; wire(880, 254, 880, 276); wire(880, 300, 880, 316); }
    Q.text(c, 'САҚТАНДЫРҒЫШ 1,5 А', 850, 290, { size: 10, weight: 800, align: 'right' });
    // резистор
    const glow = heat;
    if (glow > 0.05) { c.fillStyle = 'rgba(255,90,40,' + glow * 0.35 + ')'; c.beginPath(); c.ellipse(500, 450, 120, 50, 0, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = 'rgb(' + Math.round(10 + 245 * glow) + ',' + Math.round(10 + 90 * glow) + ',' + Math.round(10 + 20 * glow) + ')';
    c.strokeStyle = '#0A0A0A'; c.lineWidth = 4;
    Q.roundRect(c, 410, 428, 180, 44, 10); c.fill(); c.stroke();
    Q.text(c, Rname, 500, 457, { size: 18, weight: 900, align: 'center', color: glow > 0.5 ? '#0A0A0A' : '#E8FF47' });
    if (glow > 0.6) for (let i = 0; i < 3; i++) { c.strokeStyle = 'rgba(229,72,77,.5)'; c.lineWidth = 2; c.beginPath(); const x = 460 + i * 40, o = Math.sin(performance.now() / 150 + i) * 6; c.moveTo(x, 420); c.bezierCurveTo(x + o, 405, x - o, 395, x, 380); c.stroke(); }
    // вольтметр
    meter(500, 560, 52, needleV, 'V', 15, '0–15 В');
    // ток бағыты
    if (closed && I > 0.001) {
      Q.text(c, 'I →', 700, 105, { size: 16, weight: 900, color: '#E5484D' });
      Q.text(c, '← e⁻', 700, 150, { size: 13, weight: 800, color: '#1B2BFF' });
    }
    // ұшқындар
    sparks.forEach((s) => { c.fillStyle = 'rgba(255,' + Math.round(150 + 100 * s.life) + ',0,' + s.life + ')'; c.beginPath(); c.arc(s.x, s.y, 3 + s.life * 3, 0, Math.PI * 2); c.fill(); });
    if (!fuseOk) Q.text(c, 'САҚТАНДЫРҒЫШ КҮЙДІ — «Ауыстыру» батырмасын басыңыз', 500, 30, { size: 14, weight: 800, align: 'center', color: '#fff', bg: '#E5484D' });
    else if (I > FUSE) Q.text(c, '⚠ Ток тым үлкен!', 500, 30, { size: 14, weight: 800, align: 'center', color: '#0A0A0A', bg: '#E8FF47' });
  }
  requestAnimationFrame(frame);
})();
