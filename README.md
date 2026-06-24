# TaskLabs

**TaskLabs is a self-hosted task and calendar manager for teams** — Kanban boards, a shared calendar, realtime updates, and reminders that reach people on Telegram. It's built to run on your own infrastructure, so your data stays yours.

## What it does

- **Organize work visually** — drag-and-drop Kanban boards for moving tasks through stages.
- **Plan on a calendar** — schedule tasks and events, including recurring ones ("every Monday", "first of the month").
- **Work as a team** — invite members into shared workspaces; everyone sees changes the moment they happen, with no refresh.
- **Never miss a deadline** — reminders and notifications delivered through Telegram.
- **Stay organized** — labels, search, and a notifications center keep things findable.
- **Automate it** — a secure API (with revocable keys) lets other tools and AI agents work with your tasks.

## Why self-hosted

TaskLabs runs on infrastructure you control. There are no per-seat fees to a third party, customer data never leaves your environment, and daily automated backups keep you covered. It's a good fit for teams who care about data ownership and predictable costs.

## Getting it running

You'll need **Docker** (24+, with Compose v2), **Node 20+**, and **pnpm** installed.

```bash
# 1. Create your local config from the example, then fill in the values.
cp .env.example .env.dev

# 2. Start the database, backend, and admin dashboard.
docker compose --env-file .env.dev -f docker-compose.dev.yml up -d postgres backend dashboard

# 3. Generate the security keys the backend needs (one-time setup).
docker compose --env-file .env.dev -f docker-compose.dev.yml exec backend ./generate_admin_key.sh
pnpm --dir backend keys
#    Paste the generated values into .env.dev as instructed by each command.

# 4. Start the app (frontend + backend live-reload).
docker compose --env-file .env.dev -f docker-compose.dev.yml up --build frontend convex-dev
```

The app will be available at the address you set in your `.env.dev`. The `.env.example` file documents every value, with notes on what each one is for.

> **Tip:** the setup keys in steps 2–3 only need to be generated once. After that, step 4 is all you need to start working.

## Project layout

```
frontend/   The web app users interact with
backend/    The server, database schema, and business logic
docs/        Specs, build templates, and operational notes
ops/         Deployment and operations tooling
```

## Going to production

TaskLabs is designed to deploy behind **Dokploy + Cloudflare Tunnel** with automated **daily database backups** to S3-compatible storage. Production configuration (public URLs, backup storage, Telegram alerts) is documented in `.env.example` and the `docs/` folder.

## License

MIT.
