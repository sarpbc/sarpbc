# Contributing to sarpbc.org

Thanks for helping improve a clearer, healthier Rocket League esports community.

## Code of conduct

Participation is governed by [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Review expectations

We aim to review pull requests within **7 days**. If yours is waiting longer, comment on the PR or open a gentle ping — we may have missed it.

## Prerequisites

- Node.js **24.22.0** (see root README)
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

## Branch and commit names

Use one of these types: `feat`, `fix`, `perf`, `refactor`, `docs`, `style`, `test`, `build`, `ci`, `chore`, `revert`.

- Branches: `<type>/<kebab-case-description>`, for example `feat/player-search` or `fix/159-localized-seo`. The permanent `main` branch is exempt.
- Commit subjects and PR titles: `<type>(optional-scope): description`, for example `fix(back): repair player sync`. Use `!` before the colon for breaking changes, such as `feat(api)!: change player response`.
- Prefixes such as `codex/`, `cursor/`, `claude/`, `codex:`, `cursor:`, and `claude:` are rejected. The same naming rules apply to people and agents.

`pnpm install` installs Lefthook. The hooks check the current branch before commits, commit subjects before saving, and destination branches before pushes. Tags and branch deletions are exempt from the push check.

CI checks the source branch, PR title, and every commit introduced by the PR. Rebase onto `main` instead of creating commits with Git's default merge messages. Historical commits already on `main` are excluded. PR title edits rerun the checks, including for squash merges.

Keep the `CI` status check required in GitHub's branch protection for `main` to block merges when naming checks fail. Local hooks can be bypassed.

Run `pnpm test:git-names` to test the naming checks.

## Start here

| You want to…                      | Go to…                                                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Change public UI, pages, or copy  | `apps/front` — read [apps/front/README.md](apps/front/README.md) and [DESIGN.md](apps/front/DESIGN.md)         |
| Change API, data, or auth         | `apps/back` — read [apps/back/README.md](apps/back/README.md) and [ARCHITECTURE.md](apps/back/ARCHITECTURE.md) |
| Add or change user-facing strings | `apps/front/i18n/locales/en-US.json` **and** `fr-FR.json` (both required)                                      |
| Staff admin console               | `apps/admin`                                                                                                   |
| Shared types or utilities         | `packages/types`, `packages/utils` (framework-independent — no Vue/Nuxt imports)                               |
| Docs, changelog, or OSS process   | Root `README.md`, `CHANGELOG.md`, this file                                                                    |

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
