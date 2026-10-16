# apps/back — NestJS API

NestJS API for sarpbc.org: competitive data, news, forums, auth, admin operations, and the [MCP server](../../docs/MCP.md).

|          |                                        |
| -------- | -------------------------------------- |
| **Port** | `4001`                                 |
| **Env**  | `apps/back/.env` (from `.env.example`) |
| **Dev**  | `pnpm dev:back` from repo root         |

## Setup

From the repository root:

```bash
pnpm install
cp apps/back/.env.example apps/back/.env
docker compose -f docker-compose.local.yml up -d
pnpm --filter back run mikro:migrate
pnpm dev:back
```

API base: http://localhost:4001

Bring your own third-party keys (PandaScore, Google OAuth, Cloudflare Images). See root [README.md](../../README.md).

## Database migrations

MikroORM TypeScript migrations live in `src/infrastructure/database/migrations/`. The CLI and Docker entrypoint use the same migrations. Docker applies their compiled JavaScript files before starting the API.

From the repository root, generate and apply a migration with:

```bash
pnpm --filter back exec mikro-orm migration:create
pnpm --filter back run mikro:migrate
```

Integration tests rebuild a fresh PostgreSQL database through these migrations and verify that the resulting schema matches the ORM entities.

## Contributing

- Feature modules use `domain`, `application`, and `infrastructure` layers. See [Backend architecture](ARCHITECTURE.md).
- HTTP errors should be actionable for the Nuxt UI.
- Run `pnpm --filter back test` before opening a PR.

See [CONTRIBUTING.md](../../CONTRIBUTING.md) at the repo root.
