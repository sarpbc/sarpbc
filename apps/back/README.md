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

The HTTP server trusts loopback and private-network proxies, then keys the default limit (100 requests per minute) on the visitor address. When that hop is a Cloudflare edge, the visitor address is `CF-Connecting-IP`. A direct client cannot choose their bucket by sending that header. Requests that present `INTERNAL_API_TOKEN` in `x-sarpbc-internal` are limited separately at 400 requests per minute, keyed by the public address in `x-sarpbc-client` when that header is present. Without the token the client header is ignored. Leave the token unset in local development; loopback calls are already skipped.

Bring your own third-party keys (PandaScore, Google OAuth, Cloudflare Images). See root [README.md](../../README.md).

## Database migrations

MikroORM TypeScript migrations live in `src/infrastructure/database/migrations/`. The CLI and Docker entrypoint use the same migrations. Docker applies their compiled JavaScript files before starting the API.

From the repository root, generate and apply a migration with:

```bash
pnpm --filter back exec mikro-orm migration:create
pnpm --filter back run mikro:migrate
```

Integration tests rebuild a fresh PostgreSQL database through these migrations and verify that the resulting schema matches the ORM entities.

## Tests

Vitest runs unit, HTTP smoke, and PostgreSQL/Redis integration tests as separate projects. SWC preserves the NestJS decorator metadata used by the HTTP tests.

```bash
pnpm --filter back test
pnpm --filter back test:watch
pnpm --filter back test:cov
pnpm --filter back test:e2e
pnpm --filter back test:integration
pnpm --filter back typecheck:tests
```

`test:integration` builds the migrations and verifies the backend against disposable PostgreSQL and Redis containers. `test:cov` runs all projects and combines their coverage of the TypeScript sources. Both commands require Docker.

Coverage includes business rules, use cases, HTTP controllers, guards, repositories, transactions, cache adapters, and integrations. It excludes tests, type declarations, DTOs, Nest modules, ORM schema declarations, migrations, the entrypoint, and the ORM configuration and entity registry. Migrations still run in the integration tests.

The HTML report is written to `coverage/index.html`, with totals in `coverage/coverage-summary.json`.
CI requires at least 70% line and statement coverage across the combined projects.

## Contributing

- Feature modules use `domain`, `application`, and `infrastructure` layers. See [Backend architecture](ARCHITECTURE.md).
- HTTP errors should be actionable for the Nuxt UI.
- Run `pnpm --filter back test` before opening a PR.

See [CONTRIBUTING.md](../../CONTRIBUTING.md) at the repo root.
