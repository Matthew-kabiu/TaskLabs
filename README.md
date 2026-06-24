# TaskLabs

Self-hosted, multi-tenant task & calendar manager — Kanban, calendar, realtime updates, Telegram reminders.
**Stack:** Next.js 16 (frontend) · **Convex** (self-hosted backend) · Convex Auth · pnpm workspace · Docker.

> Mid-migration from a Next.js/Prisma/Redis/SSE backend to Convex. See [`MIGRATION.md`](./MIGRATION.md) for status and what remains.

## Layout
```
frontend/   Next.js 16 app (UI) — connects to Convex at NEXT_PUBLIC_CONVEX_URL
backend/    Convex project (schema, functions, auth, http, crons)
docs/       Build template, specs, plans (incl. MCP), openapi, smoke tests
```

## Prerequisites
- Docker 24+ (Compose v2), pnpm, Node 20+

## Quickstart (self-hosted Convex)
```bash
# 1. Env — local Docker dev uses .env.dev (gitignored).
#    .env.dev.example documents required values. Do not add defaults in Compose.

# 2. Bring up Postgres + Convex backend + dashboard.
#    All exposed ports and origins come from .env.dev.
docker compose --env-file .env.dev -f docker-compose.dev.yml up -d postgres backend dashboard

# 3. Generate the admin key, then put it in .env.dev (CONVEX_SELF_HOSTED_ADMIN_KEY)
#    and backend/.env.local for host-side Convex CLI use.
docker compose --env-file .env.dev -f docker-compose.dev.yml exec backend ./generate_admin_key.sh

# 4. Generate Convex Auth keys, then put JWT_PRIVATE_KEY and JWKS in .env.dev.
#    Keep the generated values one-line.
pnpm --dir backend keys

# 5. Start hot reload for both sides.
#    frontend: Next.js dev server with polling
#    convex-dev: syncs deployment env from .env.dev, then pushes backend/convex changes
docker compose --env-file .env.dev -f docker-compose.dev.yml up --build frontend convex-dev

# Or run the Convex CLI from the host after filling backend/.env.local:
pnpm install
cd backend && pnpm run sync-env && npx convex dev
```

For Docker dev, use standalone `docker-compose.dev.yml`. It keeps the same core services as `docker-compose.yml`, mounts `frontend/` and `backend/convex/` for the frontend alias, syncs Convex deployment env from `.env.dev`, runs `convex dev` as the backend watcher, and enables Chokidar polling for mounted-file hot reload. Local Compose builds use Buildx Bake's Docker exporter override so Docker Desktop loads local images directly instead of exporting attestation manifest lists during `up --build`.

## Production origins

For the Dokploy + Cloudflare Tunnel deployment, root `.env` must keep all public origins explicit:
- `FRONTEND_ORIGIN` / `SITE_URL`: frontend public origin.
- `NEXT_PUBLIC_CONVEX_URL`, `CONVEX_CLOUD_ORIGIN`, `CONVEX_SITE_ORIGIN`, `CONVEX_SELF_HOSTED_URL`, `TELEGRAM_WEBHOOK_ORIGIN`: public Convex/API origin.
- `CORS_ALLOWED_ORIGINS`: comma-separated exact origins allowed to call Next API routes.

Do not add wildcard CORS, local fallbacks, or source-code defaults. If Convex API and Convex site traffic cannot share the same Cloudflare/Dokploy route, give `CONVEX_SITE_ORIGIN` and `TELEGRAM_WEBHOOK_ORIGIN` their own public HTTPS site origin.

## Production DB backup

The production Compose stack includes `db-backup`, a Postgres-only backup scheduler. It runs `pg_dump --format custom` every day at midnight EAT (`BACKUP_CRON_SCHEDULE=0 0 * * *`, `BACKUP_TIMEZONE=Africa/Nairobi`), creates the configured RustFS bucket if missing, uploads the dump, and sends a Telegram confirmation message.

Fill these root `.env` values before enabling the full production stack:
- RustFS: `RUSTFS_ENDPOINT`, `RUSTFS_REGION`, `RUSTFS_BUCKET`, `RUSTFS_ACCESS_KEY_ID`, `RUSTFS_SECRET_ACCESS_KEY`, `RUSTFS_S3_ADDRESSING_STYLE`.
- Telegram backup confirmation: `BACKUP_TELEGRAM_BOT_TOKEN`, `BACKUP_TELEGRAM_CHAT_ID`.
- Postgres backup connection: `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `INSTANCE_NAME`.

`POSTGRES_URL` is for Convex and must be the Postgres cluster URL only, without `/<database>`; Convex derives the database name from `INSTANCE_NAME`.

## Docs
| File | Purpose |
|---|---|
| [SOP.md](./SOP.md) | How we work — layering, Definition of Done, testing, security, git rules |
| [MIGRATION.md](./MIGRATION.md) | Migration tracker — moved / remaining / next steps |
| [AGENTHANDOFF.md](./AGENTHANDOFF.md) | Agent coordination + roles |
| [CHANGELOG.md](./CHANGELOG.md) | Timestamped change log |
| [AGENTS.md](./AGENTS.md) | Hard rule: verify framework docs before coding |
| `docs/` | Backend-Build-Template, specs, plans (incl. MCP), openapi |

## License
MIT.
