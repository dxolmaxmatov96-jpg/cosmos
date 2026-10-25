# COSMOS — interaktiv Quyosh tizimi

Node.js backend + Canvas frontend. Hech qanday tashqi paket kerak emas.

## Ishga tushirish

```bash
cd cosmos
node server.js
```

Brauzerda oching: http://localhost:3000 (boshqa port: `PORT=8080 node server.js`)

## Tuzilishi

```
cosmos/
├── server.js          # Backend (API + statik fayllar + SSE)
├── package.json
└── public/
    ├── index.html     # Sahifa
    ├── style.css      # Dizayn
    └── app.js         # Frontend (Canvas animatsiyalar, fetch, SSE)
```

## Backend API

| Metod | Yo'l                 | Vazifa                                   |
|-------|----------------------|------------------------------------------|
| GET   | /api/planets         | Barcha sayyoralar                        |
| GET   | /api/planets/:id     | Bitta sayyora (masalan `earth`)          |
| GET   | /api/messages        | Oxirgi 30 ta xabar                       |
| POST  | /api/messages        | Yangi xabar `{name, text}` (rate limit)  |
| GET   | /api/stats           | Onlayn soni, xabarlar, server uptime     |
| GET   | /api/stream          | Jonli oqim (Server-Sent Events)          |

Xabarlar `messages.json` faylida saqlanadi.
