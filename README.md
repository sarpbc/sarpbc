# SARPBC Monorepo

Rocket League news and data platform.

- `apps/front`: Nuxt 4 frontend (port **4000**)
- `apps/back`: NestJS backend with MikroORM, PostgreSQL, and Redis (port **4001**)
- `apps/admin`: Nuxt 4 staff console SPA (port **4002**)

## Prerequisites

- Node.js 24.13.1
- pnpm 10+
- Docker and Docker Compose for local databases

## Install

From the repository root:

```bash
pnpm install
```

Copy environment files and adjust values:

```bash
cp apps/front/.env.example apps/front/.env
cp apps/admin/.env.example apps/admin/.env
cp apps/back/.env.example apps/back/.env
```

## Build

```bash
pnpm build
```

Single app:

```bash
pnpm --filter front build
pnpm --filter admin build
pnpm --filter back build
```

## Run Locally

Start Postgres and Redis:

```bash
docker compose -f docker-compose.local.yml up -d
```

Apply migrations, then run apps:

```bash
pnpm --filter back run mikro:migrate
pnpm dev
```

Or run one app at a time:

```bash
pnpm dev:front
pnpm dev:admin
pnpm dev:back
```

Local URLs:

- Frontend: http://localhost:4000
- API: http://localhost:4001
- Admin: http://localhost:4002

## Production Deployment (Dokploy)

Production deploys use **Dokploy**, not GitHub Actions image builds. On each push to `main`, [`release-tag.yml`](.github/workflows/release-tag.yml) creates a tag `vYYYY.MM.DD.N` (for example `v2026.06.03.42`). Configure Dokploy apps with trigger **On Tag**.

| App      | Dockerfile              | Docker context | Port |
| -------- | ----------------------- | -------------- | ---- |
| Backend  | `apps/back/Dockerfile`  | `/`            | 4001 |
| Frontend | `apps/front/Dockerfile` | `/`            | 4000 |
| Admin    | `apps/admin/Dockerfile` | `/`            | 4002 |

Suggested registry images: `ghcr.io/sarpbc/back`, `ghcr.io/sarpbc/front`, `ghcr.io/sarpbc/admin`.

Set secrets and env vars from `apps/back/.env.example`, `apps/front/.env.example`, and `apps/admin/.env.example` in Dokploy. Backend needs `ADMIN_URL` (e.g. `https://admin.sarpbc.org`) alongside `FRONT_URL`.

Optional build arg: `APP_RELEASE` = tag name.

CI on pull requests: lint, format, frontend typecheck and build — see [`.github/workflows/pr.yml`](.github/workflows/pr.yml).

## Useful Commands

```bash
pnpm dev          # front + back (+ admin if present) in parallel
pnpm dev:front
pnpm dev:admin
pnpm dev:back
pnpm fmt
pnpm fmt:check
pnpm lint
pnpm lint:fix
```

## AI / Cursor

Agent index and skill routing: [AGENTS.md](AGENTS.md). Cursor rules in `.cursor/rules/` (hub + scoped front/back).

## Migration from legacy repos

The former `sarpbc-front` and `sarpbc-back` repositories are superseded by this monorepo. Archive or mark them read-only after switching Dokploy to `sarpbc/sarpbc`.
