# sarpbc.org

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

Open-source Rocket League news and data platform for fans who want a clear, healthy place to follow the competitive scene.

- `apps/front`: Nuxt 4 frontend (port **4000**)
- `apps/back`: NestJS backend with MikroORM, PostgreSQL, and Redis (port **4001**)
- `apps/admin`: Nuxt 4 staff console SPA (port **4002**)

## Vision

**sarpbc.org** exists to make Rocket League esports easier to understand and safer to enjoy.

- **Clarity:** schedules, matches, teams, and context in one place so fans can follow the scene without needing insider fluency.
- **Healthy community:** no betting or gambling promotion, no shady practices, and no racism, homophobia, misogyny, or related harassment. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) and the site Terms of Service.
- **Independent:** sarpbc.org is a community project. It is **not** affiliated with, endorsed by, or sponsored by Psyonix LLC, Epic Games, Inc., or Rocket League.
- **Free for fans:** the site is free to use. We are not here to extract money from the community. The goal is a bigger, healthier Rocket League esports scene, and the hope that Rocket League can grow toward the same scale as titles like League of Legends and Counter-Strike.

## Why open source

The code should be reusable by the community: fork it, self-host it, fix bugs, and build on it. It is under **Apache-2.0** (free reuse with attribution). The **sarpbc.org** name, logos, and production domains are not licensed for claiming as your own. See [docs/TRADEMARK.md](docs/TRADEMARK.md).

## Community

- [Contributing](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security](SECURITY.md)
- [License](LICENSE) · [NOTICE](NOTICE)

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

Use your own third-party keys (PandaScore, Google OAuth, Cloudflare Images). PandaScore data is subject to **their** terms; bring your own API token. Never commit real secrets; local `.env` files are gitignored. Production secrets belong in Dokploy / Docker secrets only.

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

CI on pull requests: lint, format, frontend typecheck and build. See [`.github/workflows/pr.yml`](.github/workflows/pr.yml).

## MCP server

Staff AI assistants can call the SARPBC API through a [Model Context Protocol](https://modelcontextprotocol.io) server mounted on the NestJS backend.

|               |                                                                                                          |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| **Endpoint**  | `https://api.sarpbc.org/mcp` (local: `http://localhost:4001/mcp`)                                        |
| **Transport** | Stateless Streamable HTTP (`POST` only)                                                                  |
| **Auth**      | Personal access token from the admin app → **Tokens** (`/tokens`). Send `Authorization: Bearer <token>`. |

### Client configuration

**Claude Desktop** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "sarpbc": {
      "url": "https://api.sarpbc.org/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_PAT_HERE"
      }
    }
  }
}
```

**Cursor** (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "sarpbc": {
      "url": "https://api.sarpbc.org/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_PAT_HERE"
      }
    }
  }
}
```

### Tools

Read tools (any valid PAT):

| Tool                   | Description                              |
| ---------------------- | ---------------------------------------- |
| `search_players`       | Search players by name                   |
| `search_teams`         | Search teams by name                     |
| `get_player`           | Player profile by slug or id             |
| `get_team`             | Team profile and roster by slug or id    |
| `get_tournaments`      | List tournaments (`activeOnly`, `limit`) |
| `get_tournament`       | Tournament detail with matches           |
| `get_upcoming_matches` | Upcoming and live matches                |
| `get_match_results`    | Recent finished match results            |

News tools (`news.manage`):

| Tool                  | Description                                                                         |
| --------------------- | ----------------------------------------------------------------------------------- |
| `list_news_articles`  | List articles including drafts                                                      |
| `get_news_article`    | Full EN/FR article by slug or id                                                    |
| `create_news_draft`   | EN/FR news draft using `:player` / `:team` / `:tweet` MDC tags (human must publish) |
| `update_news_article` | Patch an existing article (does not publish)                                        |

Write tools (staff permission required):

| Tool                      | Permission           | Description                                 |
| ------------------------- | -------------------- | ------------------------------------------- |
| `create_match`            | `tournaments.manage` | Create a tournament match                   |
| `set_match_winner`        | `tournaments.manage` | Set match winner by participant id          |
| `trigger_tournament_sync` | `tournaments.manage` | Sync one tournament or PandaScore additions |

Staff playbook for roster-change news drafts (web verification + `create_news_draft`): [docs/playbooks/roster-change-news.md](docs/playbooks/roster-change-news.md).

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

## Design (public frontend)

Human-facing UI decisions for the Nuxt site (hub vs marketing, row grid, components): [`apps/front/DESIGN.md`](apps/front/DESIGN.md). Agent craft rules live under [`.agents/skills/geist-design/`](.agents/skills/geist-design/).

## AI / Cursor

Agent index and skill routing: [AGENTS.md](AGENTS.md). Cursor rules in `.cursor/rules/` (hub + scoped front/back).

## Migration from legacy repos

The former `sarpbc-front` and `sarpbc-back` repositories are superseded by this monorepo. Archive or mark them read-only after switching Dokploy to `sarpbc/sarpbc`.
