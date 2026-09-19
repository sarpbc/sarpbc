# apps/front — Public website

Nuxt 4 public site for [sarpbc.org](https://sarpbc.org): news, matches, tournaments, players, teams, forums, and community games.

|            |                                         |
| ---------- | --------------------------------------- |
| **Port**   | `4000`                                  |
| **Env**    | `apps/front/.env` (from `.env.example`) |
| **Dev**    | `pnpm dev:front` from repo root         |
| **Design** | [DESIGN.md](DESIGN.md)                  |

## Setup

From the repository root:

```bash
pnpm install
cp apps/front/.env.example apps/front/.env
docker compose -f docker-compose.local.yml up -d
pnpm --filter back run mikro:migrate
pnpm dev:front
```

Open http://localhost:4000. The API must be running on port `4001` for live data.

## Contributing

- All user-facing strings go in `i18n/locales/en-US.json` and `fr-FR.json`.
- UI work: [`.agents/skills/geist-design/SKILL.md`](../../.agents/skills/geist-design/SKILL.md)
- Framework: [`.agents/skills/nuxt/SKILL.md`](../../.agents/skills/nuxt/SKILL.md)

See [CONTRIBUTING.md](../../CONTRIBUTING.md) at the repo root.
