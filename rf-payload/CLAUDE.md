# Backend — Payload CMS

Payload CMS 3.56.0 on Next.js 15.4, MongoDB via Mongoose adapter.

## Running

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm generate:types   # Regenerate payload-types.ts
```

## Collections

Defined in `src/collections/`: Users, Events, Attendance, Media.

Access control uses Payload's `access` property on each collection with role-checking functions. See existing patterns — always check `req.user.role`.

## Custom API Routes

Located in `src/app/api/`:

- `events/[eventId]/attendance/route.ts` — GET (list) and PATCH (update single)
- `attendance/summary/route.ts` — GET aggregated stats (admin/trainer)
- `attendance/bulk-update/route.ts` — POST bulk updates, PATCH mark-all
- `events/[eventId]/lock/route.ts` — POST lock, DELETE unlock (via event `locked` field)
- `health/route.ts` — health check

## Hooks & Automation

- **Events afterChange hook**: On event creation → auto-create attendance records for all active players with status "pending".
- **Users afterChange hook**: On player creation → auto-create attendance records for all upcoming events.
- **Attendance beforeChange hook**: Validates permissions (role-based status restrictions, locked event checks, parent-child validation).

## CORS

Configured in `payload.config.ts`. Dev: localhost:3000 + localhost:4000. Prod: via ALLOWED_ORIGINS env var.

## Storage

- Dev: local filesystem (`media/` directory)
- Prod: Vercel Blob (enabled via BLOB_READ_WRITE_TOKEN)

The vercelBlobStorage plugin is always registered but `enabled` is conditional on the token existing. This avoids the importMap issue (see .github/instructions for details).

## Testing

- Vitest for unit tests (`vitest.config.mts`)
- Playwright for E2E (`playwright.config.ts`)

## Troubleshooting

Password reset: `tsx scripts/reset-password.ts --email admin@example.com --password 'NewPass123!'`

If you see `getFromImportMap: PayloadComponent not found` errors, run `pnpm payload generate:importmap`.

## Payload Docs

Always reference: https://payloadcms.com/docs/
