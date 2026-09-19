# Contributing to sarpbc.org

Thanks for helping improve a clearer, healthier Rocket League esports community.

## Code of conduct

Participation is governed by [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Review expectations

We aim to review pull requests within **7 days**. If yours is waiting longer, comment on the PR or open a gentle ping — we may have missed it.

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

## Start here

| You want to…                      | Go to…                                                                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Change public UI, pages, or copy  | `apps/front` — read [apps/front/README.md](apps/front/README.md) and [`.agents/skills/geist-design/SKILL.md`](.agents/skills/geist-design/SKILL.md)                |
| Change API, data, or auth         | `apps/back` — read [apps/back/README.md](apps/back/README.md) and [`.agents/skills/nestjs-best-practices/SKILL.md`](.agents/skills/nestjs-best-practices/SKILL.md) |
| Add or change user-facing strings | `apps/front/i18n/locales/en-US.json` **and** `fr-FR.json` (both required)                                                                                          |
| Staff admin console               | `apps/admin`                                                                                                                                                       |
| Shared types or utilities         | `packages/types`, `packages/utils` (framework-independent — no Vue/Nuxt imports)                                                                                   |
| Docs, changelog, or OSS process   | Root `README.md`, `CHANGELOG.md`, this file                                                                                                                        |

## Project layout

| Path         | Stack                |
| ------------ | -------------------- |
| `apps/front` | Nuxt 4 public site   |
| `apps/admin` | Nuxt 4 staff console |
| `apps/back`  | NestJS API           |

## Pull requests

1. Open an issue first for larger changes when possible. [Good first issues](https://github.com/sarpbc/sarpbc/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) are a great entry point.
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

## Recognition

Merged pull requests with non-trivial changes are credited in [CHANGELOG.md](CHANGELOG.md) under the release section (`@username`). Legal attribution for the project as a whole is in [NOTICE](NOTICE).

## Security

Report vulnerabilities privately via [SECURITY.md](SECURITY.md). Do not open public issues for exploitable bugs.

## License and trademarks

Contributions are accepted under the [Apache License 2.0](LICENSE). Branding rules: [docs/TRADEMARK.md](docs/TRADEMARK.md).
