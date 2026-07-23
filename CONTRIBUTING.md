# Contributing to sarpbc.org

Thanks for helping improve a clearer, healthier Rocket League esports community.

## Code of conduct

Participation is governed by [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Prerequisites

- Node.js **24.13.1** (see root README)
- **pnpm** 10+ (enforced via `only-allow`)
- Docker and Docker Compose for local Postgres + Redis

## Setup

```bash
pnpm install
cp apps/front/.env.example apps/front/.env
cp apps/admin/.env.example apps/admin/.env
cp apps/back/.env.example apps/back/.env
docker compose -f docker-compose.local.yml up -d
pnpm --filter back run mikro:migrate
pnpm dev
```

Local URLs: front `http://localhost:4000`, API `http://localhost:4001`, admin `http://localhost:4002`.

Bring your own third-party keys (PandaScore, Google OAuth, Cloudflare Images). Respect each provider’s terms. See [NOTICE](NOTICE).

## Project layout

| Path         | Stack                |
| ------------ | -------------------- |
| `apps/front` | Nuxt 4 public site   |
| `apps/admin` | Nuxt 4 staff console |
| `apps/back`  | NestJS API           |

## Pull requests

1. Open an issue first for larger changes when possible.
2. Keep diffs focused; match existing patterns.
3. Run before opening a PR:

```bash
pnpm lint
pnpm fmt:check
pnpm --filter back test
pnpm --filter front build
```

4. User-facing strings in Nuxt apps must use i18n (`en-US` + `fr-FR`). No hardcoded copy in templates.
5. Backend validation / HTTP errors should be actionable for the UI (what failed + what to do next).
6. Do not commit `.env`, secrets, or production credentials.

## Security

Report vulnerabilities privately via [SECURITY.md](SECURITY.md). Do not open public issues for exploitable bugs.

## License and trademarks

Contributions are accepted under the [Apache License 2.0](LICENSE). Branding rules: [docs/TRADEMARK.md](docs/TRADEMARK.md).
