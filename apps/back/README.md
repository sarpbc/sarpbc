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

## Contributing

- Feature modules under `src/`; validate input with DTOs.
- HTTP errors should be actionable for the Nuxt UI.
- Run `pnpm --filter back test` before opening a PR.

See [CONTRIBUTING.md](../../CONTRIBUTING.md) at the repo root.
