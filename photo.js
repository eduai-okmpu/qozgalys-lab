/* 06 · Фотоэффект */
(function () {
  'use strict';
  const A = Q.audio, $ = (id) => document.getElementById(id);
  const c = Q.canvas($('cv'), 1000, 625);
  let ready = false;
  const HC = 1239.84; // эВ·нм
  const KX = 330, AX = 760, TY = 300; // катод, анод, түтік центрі
  let lam = 400, inten = 60, W = 2.36, metal = 'Натрий', U = 0, Ushow = 0;
  let photons = [], electrons = [], spawnP = 0, lastClick = 0, Ishow = 0, scan = null;
  const uSl = $('U');

  Q.range('lam', (v) => Math.round(v) + ' нм', (v) => { lam = v; });
  Q.range('int', (v) => Math.round(v) + '%', (v) => { inten = v; });
  Q.seg('metal', (v, b) => { W = parseFloat(v); metal = b.textContent; if (ready) update(); });
  Q.range('U', (v) => (v > 0 ? '+' : '') + Q.fmt(v, 2) + ' В', (v) => { U = v; });
  function setLive(on, t) { $('live').classList.toggle('off', !on); $('liveTxt').textContent = t; }

  const Eph = () => HC / lam, Emax = () => Eph() - W, nu = () => 2.998e17 / lam / 1e14; // ×10¹⁴ Гц
  function current() {
    const e = Emax();
    if (e <= 0 || inten <= 0) return 0;
    const frac = U >= 0 ? 1 - 0.35 * Math.exp(-3 * U) : 0.65 * Math.max(0, 1 + U / e);
    return 12 * inten / 100 * frac * Q.clamp(e / 1.2, 0.25, 1);
  }

  function rgb(l) {
    let r = 0, g = 0, b = 0;
    if (l < 380) { r = 0.55; g = 0.25; b = 1; }
    else if (l < 440) { r = -(l - 440) / 60; b = 1; }
    else if (l < 490) { g = (l - 440) / 50; b = 1; }
    else if (l < 510) { g = 1; b = -(l - 510) / 20; }
    else if (l < 580) { r = (l - 510) / 70; g = 1; }
    else if (l < 645) { r = 1; g = -(l - 645) / 65; }
    else { r = 1; }
    return 'rgb(' + Math.round(r * 255) + ',' + Math.round(g * 255) + ',' + Math.round(b * 255) + ')';
  }

  // кесте мен график
  const table = Q.Table($('tbl'), [
    { key: 'metal', label: 'Катод' },
    { key: 'lam', label: 'λ, нм', fmt: (v) => Math.round(v) },
    { key: 'nu', label: 'ν, ×10¹⁴ Гц', fmt: (v) => Q.fmt(v, 2) },
    { key: 'U', label: 'Uт, В', fmt: (v) => Q.fmt(v, 2) }
  ]);
  const chart = Q.Chart($('chart'), { xLabel: 'ν, ×10¹⁴ Гц', yLabel: 'Uт, В', ymin: 0, xmaxDef: 15, ymaxDef: 3 });
  function update() {
    const rows = table.rows.filter((r) => r.metal === metal);
    const lines = []; let html;
    const fit = new Set(rows.map((r) => Math.round(r.lam))).size >= 2 ? Q.linreg(rows.map((r) => r.nu), rows.map((r) => r.U)) : null;
    if (fit) {
      lines.push({ f: (x) => fit.a * x + fit.b, color: '#1B2BFF' });
      const h = fit.a * 16.022, Aw = -fit.b, nu0 = -fit.b / fit.a, err = Math.abs(h - 6.626) / 6.626 * 100;
      html = '<b>' + metal + '</b> · еңіс h/e = ' + Q.fmt(fit.a, 4) + ' В/(10¹⁴ Гц)<br>Планк тұрақтысы h = e·еңіс = <b>' + Q.fmt(h, 2) + '·10⁻³⁴ Дж·с</b> (анықтамалық 6,63 · қателік ' + Q.fmt(err, 1) + '%)' +
        '<br>Шығу жұмысы A = <b>' + Q.fmt(Aw, 2) + ' эВ</b> · қызыл шекара ν₀ = <b>' + Q.fmt(nu0, 2) + '·10¹⁴ Гц</b> (λ₀ ≈ ' + Math.round(2998 / nu0) + ' нм)';
    } else html = rows.length ? 'Басқа түспен тағы бір тежеуші кернеу жазыңыз.' : metal + ' үшін әзірге өлшем жоқ. Әртүрлі түспен кемінде 3 тежеуші кернеу жазыңыз.';
    chart.set(rows.map((r) => ({ x: r.nu, y: r.U })), lines);
    $('result').innerHTML = html;
  }
  ready = true;
  update();
  $('btnRec').addEventListener('click', () => {
    const e = Emax(), I = current();
    if (e <= 0) { A.error(); return Q.toast('Фотоэффект жоқ: жиілік қызыл шекарадан төмен'); }
    if (U >= 0 || I > 0.01) { A.error(); return Q.toast('Ток әлі нөлге тең емес — кернеуді теріс жаққа азайтыңыз'); }
    if (U < -e - 0.08) { A.error(); return Q.toast('Кернеу тым үлкен. Ток дәл нөлге айналатын шекараны табыңыз'); }
    const Ut = Math.round((-U + Q.gauss(0.01)) * 100) / 100;
    table.add({ metal, lam, nu: nu(), U: Ut });
    update(); A.success();
    Q.toast('Жазылды: λ = ' + Math.round(lam) + ' нм, Uт = ' + Q.fmt(Ut, 2) + ' В');
  });
  $('btnFind').addEventListener('click', () => {
    if (Emax() <= 0) { A.error(); return Q.toast('Бұл түсте фотоэффект жоқ — λ-ны азайтыңыз'); }
    scan = { target: -Math.ceil(Emax() * 100) / 100, cur: U }; setLive(true, 'Тежеуші кернеуді іздеу…');
  });
  $('btnClear').addEventListener('click', () => { table.clear(); update(); A.click(); });
  $('btnCsv').addEventListener('click', () => { if (!table.rows.length) return Q.toast('Кесте бос'); table.csv('fotoeffekt'); A.pop(); });

  let last = performance.now(), tt = 0;
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.04); last = now; tt += dt;
    if (scan) {
      const diff = scan.target - scan.cur;
      if (Math.abs(diff) < 0.006) { uSl.value = scan.target; uSl.dispatchEvent(new Event('input')); scan = null; setLive(true, 'Ток нөлге тең болды'); A.chime(); }
      else { scan.cur += Math.sign(diff) * Math.min(Math.abs(diff), Math.max(0.15, Math.abs(diff) * 2) * dt); uSl.value = scan.cur; uSl.dispatchEvent(new Event('input')); }
    }
    Ushow += (U - Ushow) * Math.min(1, dt * 10);
    // фотондар
    spawnP += inten / 100 * 40 * dt;
    while (spawnP > 1) { spawnP--; photons.push({ t: 0, off: (Math.random() - 0.5) * 90 }); }
    photons.forEach((p) => { p.t += dt * 1.6; });
    const e = Emax();
    photons = photons.filter((p) => {
      if (p.t < 1) return true;
      if (e > 0 && Math.random() < 0.85) {
        const ke = Math.random() * e;
        electrons.push({ x: 0, y: TY + p.off * 0.9, vx: 1.2 * Math.sqrt(ke) + 0.02, vy: (Math.random() - 0.5) * 20 });
      }
      return false;
    });
    // электрондар: KE өзгерісі = U·x
    electrons.forEach((el) => {
      el.vx += U * 0.72 * dt; el.x += el.vx * dt; el.y += el.vy * dt;
      if (el.x >= 1) { el.dead = true; if (now - lastClick > 45) { A.tone(3000 + Math.random() * 800, 0.012, 'square', 0.06); lastClick = now; } }
      if (el.x < 0) el.dead = true;
    });
    electrons = electrons.filter((el) => !el.dead);
    if (electrons.length > 400) electrons.splice(0, electrons.length - 400);
    const I = current();
    Ishow += (I - Ishow) * Math.min(1, dt * 6);
    draw(e);
    $('roL').textContent = Math.round(lam) + ' нм';
    $('roNu').textContent = Q.fmt(nu(), 2) + '·10¹⁴ Гц';
    $('roU').textContent = (U > 0 ? '+' : '') + Q.fmt(U, 2) + ' В';
    $('roI').textContent = Q.fmt(Math.max(0, Ishow + (Ishow > 0.01 ? Q.gauss(0.004) : 0)), 3) + ' мкА';
    requestAnimationFrame(frame);
  }

  function draw(e) {
    c.clearRect(0, 0, 1000, 625);
    c.fillStyle = '#F6F7FF'; c.fillRect(0, 0, 1000, 625);
    Q.grid(c, 25);
    const col = rgb(lam);
    // шам
    const lx = 150, ly = 95;
    c.fillStyle = '#0A0A0A'; Q.roundRect(c, lx - 70, ly - 45, 140, 90, 18); c.fill();
    c.fillStyle = inten > 0 ? col : '#333'; c.beginPath(); c.arc(lx + 40, ly, 26, 0, Math.PI * 2); c.fill();
    Q.text(c, 'ШАМ', lx - 50, ly + 6, { size: 14, weight: 900, color: '#fff' });
    Q.text(c, lam < 380 ? 'ультракүлгін' : 'көрінетін жарық', lx, ly + 70, { size: 12, weight: 800, align: 'center', color: '#555' });
    // сәуле шоғы
    if (inten > 0) {
      c.fillStyle = col; c.globalAlpha = 0.08 + inten / 100 * 0.12;
      c.beginPath(); c.moveTo(lx + 40, ly - 22); c.lineTo(KX + 4, TY - 60); c.lineTo(KX + 4, TY + 60); c.lineTo(lx + 40, ly + 22); c.fill();
      c.globalAlpha = 1;
    }
    // түтік
    c.fillStyle = 'rgba(255,255,255,.85)'; c.strokeStyle = '#0A0A0A'; c.lineWidth = 4;
    c.beginPath(); c.ellipse((KX + AX) / 2, TY, 270, 150, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    Q.text(c, 'ВАКУУМ', (KX + AX) / 2, TY - 120, { size: 11, weight: 800, align: 'center', color: '#888' });
    // катод және анод
    c.fillStyle = '#7A7A7A'; c.fillRect(KX - 14, TY - 80, 14, 160);
    c.fillStyle = '#0A0A0A'; c.fillRect(AX, TY - 80, 12, 160);
    Q.text(c, 'K (' + metal + ')', KX - 7, TY + 108, { size: 13, weight: 900, align: 'center' });
    Q.text(c, 'A', AX + 6, TY + 108, { size: 13, weight: 900, align: 'center' });
    // өріс бағыты
    if (Math.abs(U) > 0.05) {
      c.strokeStyle = U < 0 ? 'rgba(229,72,77,.25)' : 'rgba(27,43,255,.2)'; c.lineWidth = 2;
      for (let i = -2; i <= 2; i++) { const y = TY + i * 30; c.beginPath(); c.moveTo(KX + 20, y); c.lineTo(AX - 10, y); c.stroke(); }
      Q.text(c, U < 0 ? 'тежеуші өріс' : 'үдететін өріс', (KX + AX) / 2, TY + 128, { size: 12, weight: 800, align: 'center', color: U < 0 ? '#E5484D' : '#1B2BFF' });
    }
    // фотондар
    photons.forEach((p) => {
      const x0 = lx + 40, y0 = ly, x1 = KX, y1 = TY + p.off;
      const x = Q.lerp(x0, x1, p.t), y = Q.lerp(y0, y1, p.t);
      const ang = Math.atan2(y1 - y0, x1 - x0), wl = 6 + (lam - 200) / 500 * 14;
      c.save(); c.translate(x, y); c.rotate(ang);
      c.strokeStyle = col; c.lineWidth = 3; c.beginPath();
      for (let s = -20; s <= 20; s += 2) { const yy = Math.sin(s / wl * Math.PI * 2 + tt * 20) * 5 * Math.cos(s / 40 * Math.PI); s === -20 ? c.moveTo(s, yy) : c.lineTo(s, yy); }
      c.stroke(); c.restore();
    });
    // электрондар
    c.fillStyle = '#1B2BFF';
    electrons.forEach((el) => {
      const x = Q.lerp(KX + 2, AX, el.x);
      c.beginPath(); c.arc(x, el.y, 5, 0, Math.PI * 2); c.fill();
    });
    // тізбек
    c.strokeStyle = '#0A0A0A'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(KX - 7, TY + 80); c.lineTo(KX - 7, 545); c.lineTo(420, 545); c.stroke();
    c.beginPath(); c.moveTo(AX + 6, TY + 80); c.lineTo(AX + 6, 545); c.lineTo(640, 545); c.stroke();
    // ток көзі
    c.fillStyle = '#0A0A0A'; Q.roundRect(c, 420, 510, 110, 70, 14); c.fill();
    Q.text(c, (Ushow > 0 ? '+' : '') + Q.fmt(Ushow, 2) + ' В', 475, 552, { size: 16, mono: true, align: 'center', color: '#E8FF47' });
    // микроамперметр
    c.fillStyle = '#fff'; c.lineWidth = 4; c.beginPath(); c.arc(590, 545, 46, 0, Math.PI * 2); c.fill(); c.stroke();
    const a0 = Math.PI * 1.15, a1 = Math.PI * 1.85, a = a0 + (a1 - a0) * Q.clamp(Ishow / 12, 0, 1.03);
    for (let i = 0; i <= 6; i++) { const b = a0 + (a1 - a0) * i / 6; c.lineWidth = 1.5; c.beginPath(); c.moveTo(590 + Math.cos(b) * 38, 555 + Math.sin(b) * 38); c.lineTo(590 + Math.cos(b) * 30, 555 + Math.sin(b) * 30); c.stroke(); }
    c.strokeStyle = '#E5484D'; c.lineWidth = 3; c.beginPath(); c.moveTo(590, 555); c.lineTo(590 + Math.cos(a) * 36, 555 + Math.sin(a) * 36); c.stroke();
    Q.text(c, 'мкА', 590, 580, { size: 12, weight: 900, align: 'center' });
    // энергия диаграммасы
    const ex = 830, ey = 520, sc = 70;
    Q.text(c, 'ЭНЕРГИЯ, эВ', ex, 80, { size: 12, weight: 800 });
    c.strokeStyle = '#0A0A0A'; c.lineWidth = 2; c.beginPath(); c.moveTo(ex, ey); c.lineTo(ex, 95); c.stroke();
    bar(ex + 12, ey, Eph() * sc, col, 'hν = ' + Q.fmt(Eph(), 2));
    bar(ex + 70, ey, W * sc, '#7A7A7A', 'A = ' + Q.fmt(W, 2));
    if (e > 0) bar(ex + 70, ey - W * sc, e * sc, '#1B2BFF', 'Eк = ' + Q.fmt(e, 2));
    else Q.text(c, 'hν < A', ex + 70, ey - W * sc - 14, { size: 12, weight: 900, color: '#E5484D' });
    if (e <= 0) Q.text(c, 'Фотоэффект жоқ — жарықтың жиілігі тым аз', 545, 40, { size: 14, weight: 800, align: 'center', color: '#fff', bg: '#E5484D' });
  }
  function bar(x, y, h, col, lab) {
    h = Math.min(h, 420);
    c.fillStyle = col; c.fillRect(x, y - h, 44, h);
    c.strokeStyle = '#0A0A0A'; c.lineWidth = 2; c.strokeRect(x, y - h, 44, h);
    c.save(); c.translate(x + 27, y - 8); c.rotate(-Math.PI / 2);
    Q.text(c, lab, 0, 0, { size: 12, weight: 800, mono: true, color: '#0A0A0A' }); c.restore();
  }
  requestAnimationFrame(frame);
})();
