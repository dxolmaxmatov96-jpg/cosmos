// COSMOS — Node.js backend (tashqi paketlarsiz, faqat o'rnatilgan modullar)
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const DATA_FILE = path.join(__dirname, 'messages.json');

const PLANETS = [
  { id: 'mercury', name: 'Merkuriy', color: '#b5b5b5', radius: 5,  orbit: 70,  speed: 4.15, diameterKm: 4879,   dayHours: 4222.6, moons: 0,  temp: '167 °C',  fact: 'Quyoshga eng yaqin sayyora. Bir yili atigi 88 Yer kuniga teng.' },
  { id: 'venus',   name: 'Venera',   color: '#e8c27a', radius: 8,  orbit: 105, speed: 1.62, diameterKm: 12104,  dayHours: 2802,   moons: 0,  temp: '464 °C',  fact: 'Eng issiq sayyora — qalin atmosferasi issiqxona effektini yaratadi.' },
  { id: 'earth',   name: 'Yer',      color: '#4fa3ff', radius: 8.5,orbit: 145, speed: 1.0,  diameterKm: 12756,  dayHours: 24,     moons: 1,  temp: '15 °C',   fact: 'Hayot ma\'lum bo\'lgan yagona sayyora. Yuzasining 71% qismi suv.' },
  { id: 'mars',    name: 'Mars',     color: '#ff6a3d', radius: 6,  orbit: 185, speed: 0.53, diameterKm: 6792,   dayHours: 24.6,   moons: 2,  temp: '-65 °C',  fact: 'Qizil sayyora. Quyosh tizimidagi eng baland vulqon — Olimp tog\'i (21 km).' },
  { id: 'jupiter', name: 'Yupiter',  color: '#d9a066', radius: 17, orbit: 250, speed: 0.084,diameterKm: 142984, dayHours: 9.9,    moons: 95, temp: '-110 °C', fact: 'Eng katta sayyora. Katta Qizil Dog\'i — 300 yildan beri davom etayotgan bo\'ron.' },
  { id: 'saturn',  name: 'Saturn',   color: '#f0d9a0', radius: 14, orbit: 315, speed: 0.034,diameterKm: 120536, dayHours: 10.7,   moons: 146,temp: '-140 °C', fact: 'Halqalari asosan muz zarralaridan iborat. Zichligi suvdan kam!', rings: true },
  { id: 'uranus',  name: 'Uran',     color: '#8fe3e8', radius: 10, orbit: 370, speed: 0.012,diameterKm: 51118,  dayHours: 17.2,   moons: 28, temp: '-195 °C', fact: 'Yon tomoniga yotib aylanadi — o\'qi 98° ga og\'gan.' },
  { id: 'neptune', name: 'Neptun',   color: '#4a6bff', radius: 10, orbit: 420, speed: 0.006,diameterKm: 49528,  dayHours: 16.1,   moons: 16, temp: '-200 °C', fact: 'Eng kuchli shamollar bu yerda — soatiga 2 000 km gacha.' },
];

// ---- Xabarlar (mehmonlar kitobi) — JSON faylda saqlanadi ----
let messages = [];
try { messages = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { messages = []; }
const saveMessages = () => fs.writeFile(DATA_FILE, JSON.stringify(messages, null, 2), () => {});

// ---- Jonli onlayn hisoblagich (Server-Sent Events) ----
const clients = new Set();
const broadcast = (event, data) => {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(payload);
};

// ---- Oddiy rate limit (IP bo'yicha, 1 daqiqada 5 ta xabar) ----
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < 60000);
  arr.push(now); hits.set(ip, arr);
  return arr.length > 5;
}

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

const json = (res, code, obj) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
};

const readBody = (req) => new Promise((resolve, reject) => {
  let b = '';
  req.on('data', c => { b += c; if (b.length > 5000) { reject(new Error('too big')); req.destroy(); } });
  req.on('end', () => resolve(b));
  req.on('error', reject);
});

const clean = (s, max) => String(s || '').replace(/[<>]/g, '').trim().slice(0, max);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const ip = req.socket.remoteAddress;

  // ---------- API ----------
  if (url.pathname === '/api/planets' && req.method === 'GET') return json(res, 200, PLANETS);

  if (url.pathname.startsWith('/api/planets/') && req.method === 'GET') {
    const p = PLANETS.find(x => x.id === url.pathname.split('/').pop());
    return p ? json(res, 200, p) : json(res, 404, { error: 'Sayyora topilmadi' });
  }

  if (url.pathname === '/api/messages' && req.method === 'GET') return json(res, 200, messages.slice(-30).reverse());

  if (url.pathname === '/api/messages' && req.method === 'POST') {
    if (limited(ip)) return json(res, 429, { error: 'Juda tez-tez yozyapsiz, biroz kuting' });
    try {
      const body = JSON.parse(await readBody(req));
      const name = clean(body.name, 24) || 'Sayohatchi';
      const text = clean(body.text, 200);
      if (text.length < 2) return json(res, 400, { error: 'Xabar juda qisqa' });
      const msg = { id: Date.now(), name, text, hue: Math.floor(Math.random() * 360), at: new Date().toISOString() };
      messages.push(msg); if (messages.length > 500) messages.shift();
      saveMessages();
      broadcast('message', msg);
      return json(res, 201, msg);
    } catch { return json(res, 400, { error: 'Noto\'g\'ri so\'rov' }); }
  }

  if (url.pathname === '/api/stats') return json(res, 200, { online: clients.size, messages: messages.length, uptimeSec: Math.floor(process.uptime()) });

  if (url.pathname === '/api/stream') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    clients.add(res);
    broadcast('online', { online: clients.size });
    req.on('close', () => { clients.delete(res); broadcast('online', { online: clients.size }); });
    return;
  }

  // ---------- Statik fayllar ----------
  let file = url.pathname === '/' ? '/index.html' : url.pathname;
  const full = path.normalize(path.join(PUBLIC, file));
  if (!full.startsWith(PUBLIC)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('404 — bu galaktikada sahifa yo\'q'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => console.log(`🚀 COSMOS ishga tushdi: http://localhost:${PORT}`));
