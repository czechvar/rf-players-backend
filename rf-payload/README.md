# RF Players Backend

Payload CMS 3.56 backend for the Royal Flush Players soccer team management app.

## Quick Start

```bash
cp .env.example .env   # Fill in DATABASE_URI and PAYLOAD_SECRET
pnpm install
pnpm dev               # http://localhost:3000
```

### Docker Alternative

```bash
docker-compose up      # Starts MongoDB + app on port 3000
```

## Collections

- **Users** — roles: admin, trainer, player, parent. Auth-enabled with JWT.
- **Events** — practice, game, tournament, meeting. Supports locking.
- **Attendance** — links events to players with status tracking (pending/attending/declined/attended/excused).
- **Media** — file uploads (local dev, Vercel Blob in prod).

## Custom API Endpoints

- `GET/PATCH /api/events/[eventId]/attendance` — per-event attendance
- `GET /api/attendance/summary` — aggregated stats (admin/trainer)
- `POST /api/attendance/bulk-update` — bulk status updates
- `POST/DELETE /api/events/[eventId]/lock` — lock/unlock events

## Environment Variables

See `.env.example` for the full list. Key variables:

- `DATABASE_URI` — MongoDB connection string
- `PAYLOAD_SECRET` — JWT signing secret
- `ALLOWED_ORIGINS` — comma-separated CORS origins
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob token (production only)

## Scripts

- `pnpm dev` — start dev server
- `pnpm build` — production build
- `pnpm generate:types` — regenerate `payload-types.ts`
- `tsx scripts/reset-password.ts --email admin@example.com` — reset user password
- `tsx scripts/seed-attendance.ts` — seed attendance records

## Docs

- [PHASE2-ATTENDANCE.md](./PHASE2-ATTENDANCE.md) — attendance system documentation
- [CORS-GUIDE.md](./CORS-GUIDE.md) — CORS configuration details
- [Payload CMS Docs](https://payloadcms.com/docs/)
