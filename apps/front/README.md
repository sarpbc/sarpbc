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

## Server-side API

Browser calls use `NUXT_PUBLIC_API_BASE`. During SSR and in Nitro routes, fetches use `NUXT_API_BASE_SERVER` when it is set, and the public base otherwise. Set that to the API's address on the Docker network (service DNS name and port `4001`). Do not put that URL in client-rendered links or image sources.

Set `NUXT_API_INTERNAL_TOKEN` to the same value as the API's `INTERNAL_API_TOKEN`. The Nuxt server sends it only to the private origin so those calls are not counted by the public rate limit. The staff app does not need either variable: it is a client-only SPA.

Upcoming and results lists rendered on the server are reused for 30 seconds in that Nuxt process. The in-page live refresh still requests the public API from the browser.

## Contributing

- All user-facing strings go in `i18n/locales/en-US.json` and `fr-FR.json`.
- UI work: [DESIGN.md](DESIGN.md) and its linked interface references.
- Project and framework conventions: [AGENTS.md](../../AGENTS.md).

See [CONTRIBUTING.md](../../CONTRIBUTING.md) at the repo root.
