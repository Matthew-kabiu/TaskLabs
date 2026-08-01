# TaskLabs — Open Source, Self-Hosted Task & Calendar Manager

**TaskLabs is a free, open source task and calendar manager that you host yourself.** It gives you Kanban boards, a shared calendar, realtime updates, Telegram reminders, and a built-in MCP endpoint for AI agents — running entirely on your own infrastructure, under the MIT license, with no per-seat fees and no customer data leaving your environment.

[![License: MIT](https://img.shields.io/badge/License-MIT-informational.svg)](LICENSE)
[![Self-hosted](https://img.shields.io/badge/deploy-self--hosted-success.svg)](#deploy-to-production)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org)
[![Convex](https://img.shields.io/badge/backend-Convex%20(self--hosted)-orange.svg)](https://convex.dev)
[![MCP ready](https://img.shields.io/badge/MCP-ready-blueviolet.svg)](#automate-with-mcp-and-api-keys)
[![Built by Spookie Labs](https://img.shields.io/badge/built%20by-Spookie%20Labs-1f6feb.svg)](https://www.spookielabsinc.site)
[![Live instance](https://img.shields.io/badge/live-tasklabs.spookielabsinc.site-2ea043.svg)](https://tasklabs.spookielabsinc.site/)

**[Live instance](https://tasklabs.spookielabsinc.site/)** · **[Source on GitHub](https://github.com/Matthew-kabiu/TaskLabs)** · **[Built by Spookie Labs](https://www.spookielabsinc.site)**

> **Project status — read this first.** TaskLabs is production-ready for individuals and small teams today. The multi-tenant foundations are already in place (shared workspaces, `OWNER`/`ADMIN`/`MEMBER` roles, invite links, task assignment, per-workspace API keys). A larger **team collaboration release** is in progress — see [Roadmap](#roadmap) for what is landing next and what is deliberately not built yet.

---

## Table of contents

- [Why TaskLabs](#why-tasklabs)
- [Who it's for](#who-its-for)
- [Features](#features)
- [Why self-hosted](#why-self-hosted)
- [Architecture](#architecture)
- [Quickstart](#quickstart-local-development)
- [Configuration](#configuration)
- [Automate with MCP and API keys](#automate-with-mcp-and-api-keys)
- [Deploy to production](#deploy-to-production)
- [Project layout](#project-layout)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [FAQ](#faq)
- [Created by](#created-by)
- [License](#license)

---

## Why TaskLabs

Most task managers force a trade: either you accept a SaaS vendor holding your company's work data and billing you per seat forever, or you self-host something that feels a decade old.

TaskLabs is the middle path — a modern, realtime task and calendar app that happens to run on your own hardware:

| | Typical SaaS task manager | TaskLabs |
|---|---|---|
| **Cost model** | Per user, per month, forever | Your server bill. No seat licensing. |
| **Data location** | Vendor's cloud | Your infrastructure, your jurisdiction |
| **Data export** | Vendor-defined | Direct Postgres access + daily `pg_dump` backups |
| **Customization** | Feature requests | MIT-licensed source you can fork and modify |
| **AI/automation** | Proprietary integrations | Open MCP endpoint with scoped, revocable API keys |
| **Vendor lock-in** | High | None — it's your deployment |

**Business summary:** TaskLabs converts a recurring per-seat operating expense into fixed infrastructure cost, while keeping project data inside your own compliance boundary.

**Technical summary:** A Next.js 16 frontend and a self-hosted Convex backend on Postgres, shipped as a Docker Compose stack with health checks, an explicit environment contract, and automated encrypted backups.

## Who it's for

- **Individuals and freelancers** who want a fast personal task and calendar system without a subscription.
- **Small teams and agencies** that need shared workspaces and assignment without paying per seat.
- **Privacy-sensitive and regulated organisations** — legal, healthcare, finance, public sector — where project data cannot sit in a third-party cloud.
- **Homelab and self-hosting enthusiasts** running a Docker stack behind a reverse proxy.
- **Developers building with AI agents** who want a real task backend an LLM can safely drive over MCP.

## Features

### Plan and track work

- **Kanban boards** — drag-and-drop tasks across seven workflow states, with fractional-index ordering that survives concurrent reordering.
- **Calendar** — schedule tasks and events, including recurring rules such as *every Monday* or *the first of the month*.
- **Task detail** — descriptions, priorities, due dates, labels, assignees, and private tasks that stay hidden from other workspace members.
- **Search** — cross-workspace search over tasks, events, and labels.

### Collaborate

- **Shared workspaces** with `OWNER`, `ADMIN`, and `MEMBER` roles.
- **Invite links** — hashed, expiring invitation tokens scoped to an email address and workspace. TaskLabs does not send mail itself; you share the generated link (automatic email delivery is on the roadmap).
- **Realtime by default** — Convex subscriptions push changes to every connected client, so there is no refresh button and no polling.
- **Notification centre** — in-app notifications for assignment, mentions, and event changes.

### Stay on schedule

- **Telegram reminders** — per-user bot linking with configurable lead times for tasks and events.
- **Notification lead defaults** — sensible defaults with per-user overrides.

### Operate it safely

- **Multi-tenant isolation enforced server-side.** Every backend function resolves the caller and scopes data to a workspace they belong to; cross-workspace access is treated as a critical defect.
- **Automated daily backups** — `pg_dump --format custom` uploaded to S3-compatible object storage, with a Telegram confirmation on success.
- **Explicit environment contract** — no hardcoded ports, origins, or credentials, and no silent fallback defaults. Misconfiguration fails fast instead of running insecurely.
- **First-run setup wizard** — claim the admin account and create your first workspace in the browser.

## Why self-hosted

Self-hosting TaskLabs means:

- **Data residency and compliance.** Project data, customer names in task titles, and calendar contents stay inside infrastructure you control — which is often the difference between "approved" and "blocked" in a security review.
- **Predictable cost.** A team of 5 and a team of 50 cost the same to run; you scale a container, not a subscription.
- **No vendor shutdown risk.** The MIT license and your own database mean the project cannot be discontinued out from under you.
- **Real extensibility.** Fork it, add a field, change the workflow states, wire it into your own systems.

The trade-off is honest: you are responsible for uptime, TLS, and backups. TaskLabs ships backup tooling, health checks, and a documented deployment path to keep that burden small, but it is still your server.

## Architecture

```
┌──────────────────────┐     ┌───────────────────────────┐     ┌────────────┐
│  Next.js 16 frontend │────▶│  Convex backend (self-    │────▶│  Postgres  │
│  React 19 · Tailwind │◀────│  hosted) · Convex Auth    │◀────│            │
└──────────┬───────────┘     └─────────────┬─────────────┘     └────────────┘
           │                               │
           │  POST /api/mcp                │  HTTP actions
           ▼                               ▼
   ┌───────────────┐               ┌──────────────────┐
   │  MCP clients  │               │ Telegram webhook │
   │  (AI agents)  │               │   + reminders    │
   └───────────────┘               └──────────────────┘
```

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS, shadcn/ui |
| Backend | Convex (self-hosted), Convex Auth, TypeScript |
| Database | Postgres (Convex's storage backend) |
| Realtime | Convex subscriptions — no SSE, Redis, or polling layer |
| Automation | Stateless MCP over JSON-RPC at `POST /api/mcp` |
| Packaging | Docker Compose (dev + prod parity), pnpm workspace |
| Backups | `pg_dump` → S3-compatible storage, scheduled daily |

Backend code follows a strict layering: thin public functions handle auth and validation, services hold business logic, and model helpers are the only code touching the database.

## Quickstart (local development)

> **Want to look before you install?** A live instance runs at **[tasklabs.spookielabsinc.site](https://tasklabs.spookielabsinc.site/)**. Self-hosting is the point of the project, so the steps below are the real setup — the live instance is there to show you what you're deploying.

**Prerequisites:** Docker 24+ with Compose v2, **Node 22.13+**, and pnpm. (Node 22.13 is the floor required by current pnpm releases; older Node versions fail at install time.)

```bash
# 1. Clone the repository.
git clone https://github.com/Matthew-kabiu/TaskLabs.git
cd TaskLabs

# 2. Create your local config from the documented example, then fill in values.
#    .env.dev.example is the development template; .env.example is for production.
cp .env.dev.example .env.dev

# 3. Start the database, backend, and admin dashboard.
docker compose --env-file .env.dev -f docker-compose.dev.yml up -d postgres backend dashboard

# 4. Generate the security keys the backend needs (one-time).
docker compose --env-file .env.dev -f docker-compose.dev.yml exec backend ./generate_admin_key.sh
pnpm --dir backend keys
#    Paste the generated values into .env.dev as each command instructs.

# 5. Start the app with frontend and backend live-reload.
docker compose --env-file .env.dev -f docker-compose.dev.yml up --build frontend convex-dev
```

Open the address you configured in `.env.dev` and complete the first-run setup wizard to create your admin account and first workspace.

> **Tip:** steps 3–4 are one-time. Day to day, step 5 is all you need.

## Configuration

Every setting is an explicit environment variable — there are no fallback defaults, so a missing value fails loudly rather than starting in an unsafe state.

Two committed templates document every key, both with blank values:

| Template | Copy to | Used by |
|---|---|---|
| [`.env.example`](.env.example) | `.env` | `docker-compose.yml` (production) |
| [`.env.dev.example`](.env.dev.example) | `.env.dev` | `docker-compose.dev.yml` (development) |

The development template carries the same keys as production plus the dev-only hot-reload settings. CI verifies both templates stay in sync with their Compose files.

The values you will always need to set:

| Variable | Purpose |
|---|---|
| `POSTGRES_URL` | Postgres **cluster** URL (no trailing `/<database>`) |
| `FRONTEND_ORIGIN` | Public origin of the web app, used for canonical URLs and MCP host validation |
| `NEXT_PUBLIC_CONVEX_URL` | Public origin of the Convex API |
| `CORS_ALLOWED_ORIGINS` | Exact-match allow-list — wildcards are never accepted |
| `SITE_URL`, `JWT_PRIVATE_KEY`, `JWKS` | Convex Auth configuration |
| `TELEGRAM_API_ORIGIN`, `TELEGRAM_WEBHOOK_ORIGIN` | Telegram integration origins (explicit, no defaults) |

Full reference: the **Configuration** page of the built-in docs site, and [`.env.example`](.env.example).

## Automate with MCP and API keys

TaskLabs speaks the **Model Context Protocol**, so AI agents and scripts can manage tasks directly — no scraping, no browser automation.

- **Endpoint:** `POST /api/mcp`, stateless JSON-RPC, bearer authentication only.
- **27 tools** across tasks, events, labels, workspaces, notifications, search, profile, and Telegram — including batch operations such as `tasks.deleteMany`.
- **Scoped API keys:** 19 least-privilege scopes (`tasks:read`, `tasks:write`, `events:write`, `search:read`, …) selected per key.
- **Security posture:** keys are SHA-256 hashed at rest and shown exactly once, are revocable and rotatable, support expiry, are rate-limited per key, and re-check workspace membership on every request. Credential and setup management is deliberately *not* reachable via API key.

Create and manage keys in **Settings → Profile → API keys**. See the **MCP & API keys** page of the docs site for the full tool reference.

## Deploy to production

TaskLabs ships a production Docker Compose stack that mirrors the development stack service-for-service — the only intentional difference is hot reload, which exists in dev only.

A typical deployment:

- Run the stack on any Docker-capable host or PaaS, behind a reverse proxy or tunnel that terminates TLS.
- Point three public hostnames at the stack: the frontend, the Convex API, and the Convex site proxy (which serves auth routes and the Telegram webhook). Keep the Convex admin dashboard private and reach it over an SSH tunnel.
- Set `CORS_ALLOWED_ORIGINS` to your exact HTTPS origins.
- Enable the bundled `db-backup` service for daily encrypted database backups to S3-compatible storage.

Step-by-step instructions live on the **Deployment** page of the docs site and in [`docs/`](docs).

## Project layout

```
frontend/   Next.js app — product UI, marketing landing page, public docs site
backend/    Convex functions, database schema, business logic, MCP dispatch
docs/       Specs, OpenAPI reference, deployment and ops templates
ops/        Backup tooling and operational scripts
```

Documentation source for the public docs site is in [`frontend/app/(docs)/`](frontend/app/(docs)).

## Roadmap

**In progress — team collaboration release.** TaskLabs already has the multi-tenant foundations (workspaces, roles, invitations, assignment, per-workspace API keys), and the next release focuses on making day-to-day teamwork better:

- Outbound email delivery for invitations, so members can be invited without sharing links manually
- Richer member management and permission surfaces
- Team-oriented views, filtering, and workload visibility
- Deeper activity history and collaboration signals

**Deliberately not built yet:** MCP prompts, resources, sampling, and resumable sessions are out of scope for v1 of the MCP layer.

Roadmap items are tracked in the repository's issues — see [Contributing](#contributing) if you want to help or influence priority.

## Contributing

TaskLabs is open source under the MIT license and contributions are welcome.

- **Found a bug or have an idea?** Open an issue with reproduction steps or the problem you're trying to solve.
- **Want to submit a change?** Branch off `main`, keep commits focused, and make sure typecheck, lint, and tests pass for every package you touched.
- **Working on the codebase?** Read [`SOP.md`](SOP.md) first — it documents the architecture, layering rules, multi-tenancy requirements, environment discipline, and definition of done that the project holds itself to.

Two rules matter more than the rest: **every protected backend function must scope data to a workspace the caller belongs to**, and **no secrets, ports, or origins may be hardcoded or given fallback defaults**.

## FAQ

**Is TaskLabs really free and open source?**
Yes. It is released under the [MIT license](LICENSE) — free to use, modify, self-host, and deploy commercially, with no seat limits or paid tier.

**Is it a Jira, Trello, Asana, or Todoist replacement?**
It covers the core of what most teams use those tools for — Kanban boards, a calendar, assignment, labels, search, and reminders — without a subscription or third-party data hosting. It does not attempt to match enterprise Jira's issue-tracking depth.

**Can I use it for a whole team?**
Yes. Shared workspaces, `OWNER`/`ADMIN`/`MEMBER` roles, invite links, and task assignment work today, and a dedicated team collaboration release is in progress. Solo use is fully supported and needs no configuration.

**Does my data ever leave my server?**
No. TaskLabs makes no outbound calls except to services you explicitly configure — currently Telegram (if you enable reminders) and your own S3-compatible backup storage.

**What do I need to run it?**
Docker 24+ with Compose v2, Node 22.13+, and pnpm. A small VPS is enough for a team.

**Can AI agents use TaskLabs?**
Yes — that is what the [MCP endpoint](#automate-with-mcp-and-api-keys) is for. Point any MCP-compatible client at `POST /api/mcp` with a scoped API key and it can create, query, update, and delete tasks and events within the permissions you granted.

**How are backups handled?**
The bundled `db-backup` service runs a daily `pg_dump --format custom`, uploads it to S3-compatible storage, and sends a Telegram confirmation. Because it is your Postgres database, you can also back it up with any standard tooling.

## Created by

TaskLabs is built and maintained by **[Spookie Labs](https://www.spookielabsinc.site)** — see [spookielabsinc.site](https://www.spookielabsinc.site) for our other work and to get in touch.

- **Live instance:** [tasklabs.spookielabsinc.site](https://tasklabs.spookielabsinc.site/)
- **Source:** [github.com/Matthew-kabiu/TaskLabs](https://github.com/Matthew-kabiu/TaskLabs)

If TaskLabs is useful to you, starring the repository helps other self-hosters find it.

## License

Released under the [MIT License](LICENSE). Copyright © 2026 [Spookie Organization](https://www.spookielabsinc.site).
