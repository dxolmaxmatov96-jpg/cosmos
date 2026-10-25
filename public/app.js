// COSMOS — frontend (sof JavaScript + Canvas)
const $ = (s) => document.querySelector(s);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============ 1. Yulduzli fon (parallax + uchar yulduzlar) ============ */
(() => {
  const c = $('#stars'), g = c.getContext('2d');
  let W, H, stars = [], shooters = [], mx = 0, my = 0, sx = 0, sy = 0, scrollY = 0;
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = c.width = innerWidth * dpr; H = c.height = innerHeight * dpr;
    c.style.width = innerWidth + 'px'; c.style.height = innerHeight + 'px';
    const n = Math.floor((innerWidth * innerHeight) / 5000);
    stars = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H, z: Math.random() * 0.9 + 0.1,
      tw: Math.random() * 6.28, hue: Math.random() < .2 ? 200 : Math.random() < .1 ? 20 : 0,
    }));
  };
  addEventListener('resize', resize); resize();
  addEventListener('mousemove', (e) => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; });
  addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });
  let t = 0;
  (function loop() {
    t += 0.016; sx += (mx - sx) * .05; sy += (my - sy) * .05;
    g.clearRect(0, 0, W, H);
    for (const s of stars) {
      const px = ((s.x - sx * 60 * s.z * 2) % W + W) % W;
      const py = ((s.y - sy * 60 * s.z * 2 - scrollY * s.z * .4) % H + H) % H;
      const a = (.35 + .65 * Math.abs(Math.sin(t * s.z + s.tw))) * s.z;
      g.fillStyle = s.hue ? `hsla(${s.hue},100%,80%,${a})` : `rgba(255,255,255,${a})`;
      g.beginPath(); g.arc(px, py, s.z * 1.5 * (devicePixelRatio > 1 ? 1.4 : 1), 0, 6.283); g.fill();
    }
    if (!reduceMotion && Math.random() < .008) shooters.push({ x: Math.random() * W, y: Math.random() * H * .5, vx: 14 + Math.random() * 10, vy: 6 + Math.random() * 6, life: 1 });
    shooters = shooters.filter((s) => s.life > 0);
    for (const s of shooters) {
      const grad = g.createLinearGradient(s.x, s.y, s.x - s.vx * 8, s.y - s.vy * 8);
      grad.addColorStop(0, `rgba(255,255,255,${s.life})`); grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.strokeStyle = grad; g.lineWidth = 2; g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(s.x - s.vx * 8, s.y - s.vy * 8); g.stroke();
      s.x += s.vx; s.y += s.vy; s.life -= .02;
    }
    requestAnimationFrame(loop);
  })();
})();

/* ============ 2. Kursor nuri ============ */
addEventListener('mousemove', (e) => {
  const el = $('#cursorGlow'); el.style.left = e.clientX + 'px'; el.style.top = e.clientY + 'px';
});

/* ============ 3. Scroll animatsiyasi ============ */
const io = new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); if (e.target.querySelector('[data-count]')) countUp(e.target.querySelector('[data-count]')); }
}), { threshold: .15 });
document.querySelectorAll('.reveal').forEach((el, i) => { el.style.transitionDelay = (i % 4) * 90 + 'ms'; io.observe(el); });

function fmt(n, mode) {
  if (mode === 'short') return n >= 1e9 ? (n / 1e9).toFixed(1) + ' mlrd' : n.toLocaleString('uz');
  return Math.round(n).toLocaleString('uz');
}
function countUp(el) {
  const target = +el.dataset.count, mode = el.dataset.fmt, t0 = performance.now(), dur = 1800;
  (function step(now) {
    const p = Math.min((now - t0) / dur, 1), e = 1 - Math.pow(1 - p, 4);
    el.textContent = fmt(target * e, mode);
    if (p < 1) requestAnimationFrame(step);
  })(t0);
}

/* ============ 4. Quyosh tizimi (backenddan ma'lumot oladi) ============ */
let PLANETS = [];
const solar = $('#solar'), sg = solar.getContext('2d');
let SW, SH, scale = 1, simTime = 0, speed = 1, paused = false, hover = null, selected = null, zoomPulse = 0;
const angle0 = {};
const resizeSolar = () => {
  const dpr = Math.min(devicePixelRatio || 1, 2), r = solar.getBoundingClientRect();
  SW = solar.width = r.width * dpr; SH = solar.height = r.height * dpr;
  scale = Math.min(SW, SH) / 2 / 450;
  if (innerWidth < 700) scale = Math.min(SW, SH) / 2 / 450;
};
addEventListener('resize', resizeSolar); resizeSolar();

fetch('/api/planets').then((r) => r.json()).then((d) => {
  PLANETS = d; d.forEach((p, i) => (angle0[p.id] = (i * 1.7) % 6.283));
}).catch(() => {});

const pos = (p) => {
  const a = angle0[p.id] + simTime * p.speed * 0.6;
  return { x: SW / 2 + Math.cos(a) * p.orbit * scale, y: SH / 2 + Math.sin(a) * p.orbit * scale * 0.42 + 0, a };
};

function drawSolar() {
  if (!paused) simTime += 0.016 * speed;
  sg.clearRect(0, 0, SW, SH);
  const cx = SW / 2, cy = SH / 2;

  // Quyosh
  const pulse = 1 + Math.sin(performance.now() / 600) * .04;
  const R = 34 * scale * pulse;
  let gl = sg.createRadialGradient(cx, cy, R * .3, cx, cy, R * 4.5);
  gl.addColorStop(0, 'rgba(255,200,80,.55)'); gl.addColorStop(.4, 'rgba(255,120,30,.18)'); gl.addColorStop(1, 'rgba(255,100,0,0)');
  sg.fillStyle = gl; sg.fillRect(0, 0, SW, SH);
  gl = sg.createRadialGradient(cx - R * .25, cy - R * .25, R * .1, cx, cy, R);
  gl.addColorStop(0, '#fffbe0'); gl.addColorStop(.5, '#ffc83d'); gl.addColorStop(1, '#ff7a00');
  sg.fillStyle = gl; sg.beginPath(); sg.arc(cx, cy, R, 0, 6.283); sg.fill();

  // Orbitalar
  sg.lineWidth = 1 * (devicePixelRatio || 1);
  for (const p of PLANETS) {
    sg.strokeStyle = selected === p.id ? 'rgba(0,229,255,.55)' : 'rgba(255,255,255,.09)';
    sg.beginPath(); sg.ellipse(cx, cy, p.orbit * scale, p.orbit * scale * 0.42, 0, 0, 6.283); sg.stroke();
  }

  // Sayyoralar (orqada → oldinda tartibida)
  const list = PLANETS.map((p) => ({ p, ...pos(p) })).sort((a, b) => a.y - b.y);
  for (const { p, x, y, a } of list) {
    const r = p.radius * scale * (1 + (y - cy) / SH * .5);
    p._hit = { x, y, r: Math.max(r, 14 * (devicePixelRatio || 1)) };
    const isHot = hover === p.id || selected === p.id;

    if (p.rings) { // Saturn halqasi (orqa yarmi)
      sg.save(); sg.translate(x, y); sg.rotate(-0.35); sg.strokeStyle = 'rgba(240,217,160,.55)'; sg.lineWidth = r * .35;
      sg.beginPath(); sg.ellipse(0, 0, r * 1.9, r * .55, 0, Math.PI, 6.283); sg.stroke(); sg.restore();
    }
    // yaltirash
    const halo = sg.createRadialGradient(x, y, r * .5, x, y, r * (isHot ? 4 : 2.4));
    halo.addColorStop(0, p.color + (isHot ? '99' : '44')); halo.addColorStop(1, p.color + '00');
    sg.fillStyle = halo; sg.beginPath(); sg.arc(x, y, r * (isHot ? 4 : 2.4), 0, 6.283); sg.fill();
    // shar (Quyoshdan yoritilgan)
    const lx = x + (cx - x) * .02, ly = y + (cy - y) * .02, ang = Math.atan2(cy - y, cx - x);
    const body = sg.createRadialGradient(x + Math.cos(ang) * r * .45, y + Math.sin(ang) * r * .45, r * .1, x, y, r * 1.05);
    body.addColorStop(0, '#ffffffcc'); body.addColorStop(.25, p.color); body.addColorStop(1, '#00000099');
    sg.fillStyle = body; sg.beginPath(); sg.arc(x, y, r, 0, 6.283); sg.fill();
    if (p.rings) { // halqaning old yarmi
      sg.save(); sg.translate(x, y); sg.rotate(-0.35); sg.strokeStyle = 'rgba(240,217,160,.75)'; sg.lineWidth = r * .35;
      sg.beginPath(); sg.ellipse(0, 0, r * 1.9, r * .55, 0, 0, Math.PI); sg.stroke(); sg.restore();
    }
    if (p.id === 'earth') { // Oy
      const ma = simTime * 6, mx_ = x + Math.cos(ma) * r * 2.2, my_ = y + Math.sin(ma) * r * 1.1;
      sg.fillStyle = '#ddd'; sg.beginPath(); sg.arc(mx_, my_, r * .27, 0, 6.283); sg.fill();
    }
    if (isHot) { // nom
      sg.font = `500 ${13 * (devicePixelRatio || 1)}px Inter, sans-serif`; sg.textAlign = 'center';
      sg.fillStyle = '#fff'; sg.fillText(p.name, x, y - r - 12 * (devicePixelRatio || 1));
    }
  }
  if (selected) { // tanlangan sayyora atrofida halqa
    const p = PLANETS.find((q) => q.id === selected);
    if (p?._hit) {
      zoomPulse += .05; const { x, y, r } = p._hit;
      sg.strokeStyle = `rgba(0,229,255,${.5 + Math.sin(zoomPulse) * .3})`; sg.lineWidth = 2;
      sg.beginPath(); sg.arc(x, y, r * 1.8 + Math.sin(zoomPulse) * 3, 0, 6.283); sg.stroke();
    }
  }
  requestAnimationFrame(drawSolar);
}
drawSolar();

const pick = (e) => {
  const rect = solar.getBoundingClientRect(), k = solar.width / rect.width;
  const mx = (e.clientX - rect.left) * k, my = (e.clientY - rect.top) * k;
  let found = null, best = 1e9;
  for (const p of PLANETS) if (p._hit) {
    const d = Math.hypot(mx - p._hit.x, my - p._hit.y);
    if (d < p._hit.r * 1.6 && d < best) { best = d; found = p.id; }
  }
  return found;
};
solar.addEventListener('mousemove', (e) => { hover = pick(e); solar.style.cursor = hover ? 'pointer' : 'grab'; });
solar.addEventListener('mouseleave', () => (hover = null));
solar.addEventListener('click', (e) => { const id = pick(e); id ? openPlanet(id) : closePanel(); });

$('#speed').addEventListener('input', (e) => { speed = +e.target.value; $('#speedLabel').textContent = speed.toFixed(1) + '×'; });
$('#pauseBtn').addEventListener('click', (e) => { paused = !paused; e.target.textContent = paused ? '▶' : '❚❚'; });
$('#panelClose').addEventListener('click', closePanel);
addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanel(); });

async function openPlanet(id) {
  selected = id;
  try {
    const p = await (await fetch('/api/planets/' + id)).json();
    $('#pName').textContent = p.name; $('#pFact').textContent = p.fact;
    $('#pDiam').textContent = p.diameterKm.toLocaleString('uz') + ' km';
    $('#pTemp').textContent = p.temp; $('#pMoons').textContent = p.moons;
    $('#pDay').textContent = p.dayHours >= 48 ? Math.round(p.dayHours / 24) + ' Yer kuni' : p.dayHours + ' soat';
    $('#pOrb').style.setProperty('--pc', p.color);
    $('#pBar').style.width = '0';
    $('#panel').classList.add('open');
    setTimeout(() => ($('#pBar').style.width = Math.min(100, (p.diameterKm / 142984) * 100 + 3) + '%'), 120);
  } catch { /* tarmoq xatosi */ }
}
function closePanel() { selected = null; $('#panel').classList.remove('open'); }

/* ============ 5. Statistika (backend /api/stats) ============ */
async function loadStats() {
  try {
    const s = await (await fetch('/api/stats')).json();
    $('#onlineCount').textContent = s.online;
    $('#msgCount').dataset.count = s.messages; $('#msgCount').textContent = s.messages.toLocaleString('uz');
    const h = Math.floor(s.uptimeSec / 3600), m = Math.floor((s.uptimeSec % 3600) / 60);
    $('#uptime').textContent = h ? `${h} soat ${m} daq` : `${m} daq ${s.uptimeSec % 60} s`;
  } catch {}
}
loadStats(); setInterval(loadStats, 5000);

/* ============ 6. Mehmonlar kitobi + jonli oqim (SSE) ============ */
const wall = $('#wall');
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ago = (iso) => { const s = (Date.now() - new Date(iso)) / 1000; return s < 60 ? 'hozirgina' : s < 3600 ? Math.floor(s / 60) + ' daq oldin' : s < 86400 ? Math.floor(s / 3600) + ' soat oldin' : new Date(iso).toLocaleDateString('uz'); };
function addMsg(m, fresh) {
  if (wall.querySelector(`[data-id="${m.id}"]`)) return;
  const li = document.createElement('li'); li.dataset.id = m.id; li.style.setProperty('--h', m.hue);
  li.innerHTML = `<strong>${esc(m.name)}</strong><p>${esc(m.text)}</p><small>${ago(m.at)}</small>`;
  if (fresh) { li.classList.add('fresh'); setTimeout(() => li.classList.remove('fresh'), 4000); }
  wall.prepend(li);
  while (wall.children.length > 30) wall.lastChild.remove();
}
fetch('/api/messages').then((r) => r.json()).then((arr) => arr.reverse().forEach((m) => addMsg(m, false)));

$('#form').addEventListener('submit', async (e) => {
  e.preventDefault(); $('#err').textContent = '';
  const body = { name: $('#name').value, text: $('#text').value };
  try {
    const r = await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) return ($('#err').textContent = d.error || 'Xatolik');
    $('#text').value = ''; loadStats();
  } catch { $('#err').textContent = 'Server bilan aloqa yo\'q'; }
});

const es = new EventSource('/api/stream');
es.addEventListener('message', (e) => addMsg(JSON.parse(e.data), true));
es.addEventListener('online', (e) => ($('#onlineCount').textContent = JSON.parse(e.data).online));
