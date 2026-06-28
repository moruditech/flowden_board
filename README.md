# Team Workspace

A production-grade open-source team collaboration tool built with the MERN stack,
Socket.io real-time sync, BullMQ background jobs, and 13 Handlebars email templates.

---

## Stack

| Layer | Technology |
|---|---|
| API | Node.js 20 + Express 4 |
| Database | MongoDB 7 + Mongoose 8 |
| Cache / Queue | Redis 7 + BullMQ 5 |
| Real-time | Socket.io 4 |
| Email | Nodemailer + Handlebars (13 templates) |
| Validation | Joi 17 |
| Auth | JWT access (15m) + refresh (7d, httpOnly cookie) |
| Frontend | React 18 + Vite 5 |
| Server state | TanStack Query v5 |
| UI state | Zustand 4 |
| Drag and drop | @dnd-kit |
| Styling | Tailwind CSS 3 |
| Testing | Jest + Supertest + mongodb-memory-server |
| Process manager | PM2 |

---

## Quick Start

### Prerequisites
- Node.js >= 20
- MongoDB 7 (local or Atlas)
- Redis 7 (local or managed)
- npm >= 9

### 1. Clone
```bash
git clone https://github.com/your-org/team-workspace.git
cd team-workspace
```

### 2. Server setup
```bash
cd server
cp .env.example .env        # Fill in your values
npm install
npm run seed                # Optional: populate demo data
npm run dev
```

### 3. Client setup
```bash
cd client
cp .env.example .env        # Set VITE_API_URL and VITE_SOCKET_URL
npm install
npm run dev
```

### 4. Run with Docker
```bash
cp .env.example .env        # Fill in JWT secrets
docker compose up -d
```

Server: http://localhost:5000  
Client: http://localhost:5173 (run separately with npm run dev)

---

## Environment Variables

See `server/.env.example` for the full list. Required variables:

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `REDIS_HOST` | Redis host |
| `JWT_ACCESS_SECRET` | Min 32 chars — generate with `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Min 32 chars — different from access secret |
| `CLIENT_URL` | Frontend origin for CORS |
| `SMTP_HOST/PORT/USER/PASS` | SMTP credentials (use Mailtrap for dev) |

---

## Project Structure

```
team-workspace/
├── server/
│   ├── server.js               Entry point
│   ├── app.js                  Express factory
│   └── src/
│       ├── config/             env, database, redis
│       ├── shared/
│       │   ├── models/         8 Mongoose models (one per file)
│       │   ├── middleware/     7 middleware (one per file)
│       │   └── utils/          8 utilities (one per file)
│       └── modules/
│           ├── auth/           validation, service, controller, routes
│           ├── users/
│           ├── organizations/
│           ├── boards/
│           ├── tasks/
│           ├── invites/
│           ├── activity/
│           ├── email/          service, queue, worker, 13 templates
│           └── realtime/       socket, auth, board + presence handlers
│
└── client/
    └── src/
        ├── api/                One file per backend module
        ├── components/         ui/, layout/, shared/
        └── features/           auth, organizations, boards, activity, invites
```

---

## Architecture

**Module rule:** Each module owns its routes, controller, service, and validation.
Modules never import each other's services directly — they communicate only through
the `eventBus` (Node.js EventEmitter).

**Event flow:**
```
Service → eventBus.emit()
  → activity.service (logs to DB)
  → email.module (queues BullMQ job → worker → Nodemailer)
  → realtime/board.handler (broadcasts to Socket.io room)
```

**Real-time:**
```
REST write → MongoDB → eventBus → Socket.io room broadcast
```
Services have zero knowledge of sockets. Socket gateway has zero knowledge of DB writes.

**Token rotation:**
Access tokens live 15 minutes. Refresh tokens are stored as SHA-256 hashes (one per
session). On every refresh: delete old document, issue new pair. Replay attack on a
revoked token returns 401.

---

## API

Base URL: `POST /api/v1`

All responses: `{ success: true, data: {} }` or `{ success: false, error: { code, message } }`

See `docs/api.md` for the full endpoint reference.

---

## Email

13 Handlebars templates covering every lifecycle event. All email sending is
async via BullMQ — email failures never block API responses. Retries 3 times
with exponential backoff.

See `docs/email-setup.md` for SMTP configuration.

---

## Tests

```bash
cd server
npm test                  # All suites
npm run test:coverage     # With coverage report
```

5 test suites covering auth, organizations, boards, tasks, and invites.
Uses `mongodb-memory-server` — no external database needed for tests.

---

## Deployment

See `docs/deployment.md`.

Short version:
- **API**: Render or Railway (supports long-lived WebSocket connections)
- **Frontend**: Vercel
- **DB**: MongoDB Atlas (free M0 tier sufficient to start)
- **Redis**: Render Redis or Upstash

---

## Contributing

See `CONTRIBUTING.md`.

---

## License

MIT
