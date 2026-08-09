# AGENTS.md

# Engineering Principles

- Do not preserve backward compatibility. Remove obsolete code instead of adding compatibility layers, fallbacks, or migrations.
- Choose the simplest implementation that fully satisfies the current requirements. Avoid speculative abstractions and unnecessary configuration.
- Grow the system incrementally. Build the smallest version that works end-to-end before adding capabilities.
- Keep components modular and responsibilities clearly separated.
- Prefer mature, well-maintained libraries over custom implementations unless there is a compelling reason.
- Reuse existing project dependencies before introducing new ones.
- Make architectural decisions that are intended to last, not temporary stopgaps.

---

# Project

SARPBC is a Rocket League esports platform combining news, competitive data, forums and community features.

This repository is a pnpm monorepo containing:

- **apps/front** — Public Nuxt 4 website
- **apps/back** — NestJS API
- **apps/admin** — Internal Nuxt 4 staff application
- **packages/** — Shared libraries

This file contains only repository-wide guidance.

Framework-specific and domain-specific rules live inside `.agents/skills/`.

---

# Repository Layout

## Applications

| Path         | Purpose                 |
| ------------ | ----------------------- |
| `apps/front` | Public website          |
| `apps/back`  | NestJS API              |
| `apps/admin` | Internal administration |

## Shared packages

| Package               | Purpose                               |
| --------------------- | ------------------------------------- |
| `@sarpbc/types`       | Shared domain types (TypeScript only) |
| `@sarpbc/utils`       | Shared utilities (TypeScript only)    |
| `@sarpbc/composables` | Shared Nuxt composables               |
| `@sarpbc/ui`          | Shared Vue components                 |

### Package Rules

- `types` and `utils` must remain framework-independent.
- Never import Vue or Nuxt into `types` or `utils`.
- Use `workspace:*` for internal dependencies.

---

# Skills

Before making significant changes, load the relevant skill(s).

| Skill                                | When to use                                                   |
| ------------------------------------ | ------------------------------------------------------------- |
| `nuxt`                               | Nuxt, Vue, routing, SSR, composables, Nitro                   |
| `nestjs-best-practices`              | Backend architecture, modules, DTOs, MikroORM, authentication |
| `geist-design`                       | UI, UX, forms, accessibility, copywriting                     |
| `llm-safe-design-system`             | Design system rules                                           |
| `customer-needs`                     | Product feedback interpretation                               |
| `sarpbc-pm`                          | Roadmap, backlog, feature planning                            |
| `improve-codebase-architecture`      | Large architectural refactors                                 |
| `thermo-nuclear-code-quality-review` | Deep code quality audits                                      |
| `grill-me`                           | Critical review and planning sessions                         |

Each skill contains the authoritative guidance for its domain.

---

# Repository Conventions

## TypeScript

- Prefer explicit typing.
- Use exhaustive `switch` statements with `never`.
- Match the existing code style.

## Internationalization

- Every user-facing string must be translated.
- Supported locales:
  - `en-US`
  - `fr-FR`

## API

- Frontend communicates only through the NestJS API.
- Authentication uses cookies.

## Code Changes

- Prefer minimal, focused diffs.
- Avoid unrelated refactors.
- Remove dead code instead of leaving unused paths.
- Keep implementations simple.

---

# Workflow

When working on this repository:

1. Identify the affected application(s).
2. Read the corresponding skill(s).
3. Follow repository conventions.
4. Run formatting and linting before considering the task complete.

---

# References

- `README.md` — Human onboarding
- `apps/front/DESIGN.md` — Human design documentation
- `.agents/skills/` — Detailed agent instructions

---

# Cursor Cloud specific instructions

The startup update script runs `pnpm install` only. Everything below must be started/created manually per session (dependencies persist; the running services, `.env` files, and DB migrations do not).

## Node / pnpm

- The repo pins Node `24.13.1` (`.nvmrc`), installed via nvm. A base `/exec-daemon/node` (v22) shadows nvm on `PATH`, so `node -v` reports v22 by default. For each shell that runs the apps, put nvm's node first: `export PATH="$HOME/.nvm/versions/node/v24.13.1/bin:$PATH"`. `pnpm` (11.17.0, via corepack) lives on that same nvm path, so this export also fixes `pnpm: command not found`.

## Local services (Postgres + Redis)

- Docker Engine is installed. Start the daemon once per session if `docker info` fails: run `sudo dockerd > /tmp/dockerd.log 2>&1 &` (this is Docker 29, already configured with `fuse-overlayfs` + `containerd-snapshotter: false` in `/etc/docker/daemon.json`, and iptables set to legacy). Then `sudo docker compose -f docker-compose.local.yml up -d` → Postgres on host `5433`, Redis on host `6380`. `docker` needs `sudo`.

## Backend `.env` gotchas (`apps/back/.env`)

- `.env.example` is written for running the API _inside_ the Docker network. When running on the host (the normal `pnpm dev` flow), override: `DB_HOST=localhost`, `REDIS_HOST=localhost`, and add `REDIS_PORT=6380` (not in the example; compose maps 6380→6379). `DB_PORT=5433` is already correct.
- `PANDASCORE_API_TOKEN` must be **non-empty** or the backend crashes on boot (`PandascoreApiClient` throws on a falsy token). The example ships it empty. Set any placeholder (e.g. `local-dev-placeholder`) for local dev — the token is only actually used when a PandaScore sync runs (`PANDASCORE_SYNC_ON_BOOT=false` by default; the 5-min/midnight cron will log 401s with a placeholder, which is harmless). `apps/front/.env` and `apps/admin/.env` can be copied from their examples unchanged.

## DB migrations

- Run once after Postgres is up (and after pulling schema changes): `pnpm --filter back run mikro:migrate`. There is no seed script — data is created via the app/API or entered manually.

## Running / ports

- Standard commands are in `README.md` and root `package.json` (`pnpm dev`, `pnpm dev:back|front|admin`, `pnpm lint`, `pnpm test:back`, `pnpm test:front`). Turbo `test` depends on `build`, so `pnpm test:back` also builds the backend. Ports: front `4000`, back `4001` (also `/mcp`), admin `4002` (admin is SPA, `ssr:false`). Backend CORS already allowlists these localhost ports.
