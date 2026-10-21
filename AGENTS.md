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

sarpbc.org is a Rocket League esports platform combining news, competitive data, forums and community features.

Use `sarpbc.org` as the project and product name in documentation and copy.

This repository is a pnpm monorepo containing:

- **apps/front** — Public Nuxt 4 website
- **apps/back** — NestJS API
- **apps/admin** — Internal Nuxt 4 staff application
- **packages/** — Shared libraries

This file contains only repository-wide guidance.

Project instructions and design decisions live in the documentation linked below.
Personal agent workflows are installed outside this repository and do not define
the project's architecture, design or delivery conventions.

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

# Project context

Read this file before significant work, then the documentation for the affected
scope. Applicable nested instruction files refine the guidance for their own
directory. Read the relevant design before changing UI; do not apply the public
site's layout to the staff application by default.

| Scope                                                | Source of truth                                                                                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Design scope and application boundaries              | [DESIGN.md](DESIGN.md)                                                                                                                           |
| Public UI, interaction, copy and tokens              | [apps/front/DESIGN.md](apps/front/DESIGN.md)                                                                                                     |
| Supporting interface conventions                     | [apps/front/design/INTERFACE.md](apps/front/design/INTERFACE.md), [TOKENS.md](apps/front/design/TOKENS.md), [NUXT.md](apps/front/design/NUXT.md) |
| Backend modules, ports, persistence and transactions | [apps/back/ARCHITECTURE.md](apps/back/ARCHITECTURE.md)                                                                                           |
| Product scope, personas and backlog                  | [docs/PRODUCT.md](docs/PRODUCT.md)                                                                                                               |
| News tone, sourcing and bilingual drafts             | [docs/playbooks/roster-change-news.md](docs/playbooks/roster-change-news.md#4-drafting)                                                          |
| Setup, naming and delivery checks                    | [CONTRIBUTING.md](CONTRIBUTING.md), the affected app's README and package scripts                                                                |

Project documents take precedence over personal workflow defaults. Keep reusable
personal skills outside this repo. Do not add a skill library, model routing or
a dependency on a personal plugin to make the project usable.

For frontend work, reuse the affected app's Nuxt 4 conventions and `@nuxt/ui`
components. Use SSR-aware data fetching, localized navigation and cookie
credentials to the NestJS API. Public primitives live in
`apps/front/app/components/s/`; cross-app UI belongs in `packages/ui`. Inspect
existing helpers before adding a wrapper. Cover loading, empty, error and
populated states, keyboard use and the supported locales.

For backend work, read the architecture document first. Domain and application
code remain free of framework and storage dependencies; infrastructure owns
Nest providers, HTTP validation, ORM records and adapters. Consumers use
application contracts instead of private persistence implementations. Verify
transactions and schema changes with the appropriate existing checks.

For news, preserve the documented neutral, scene-informed tone without hype.
Attribute sources, distinguish reports from confirmed announcements and write
natural French. Human staff review and publish drafts in admin.

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

- Branches must use `<type>/<kebab-case-description>` and commit subjects and PR titles must use `<type>(optional-scope): description`. Allowed types: `feat`, `fix`, `perf`, `refactor`, `docs`, `style`, `test`, `build`, `ci`, `chore`, `revert`. Never use `codex`, `cursor`, or `claude` as a prefix. Never add `Co-authored-by` or session trailers crediting an agent to commits or PR descriptions. See `CONTRIBUTING.md`.
- Prefer minimal, focused diffs.
- Name test files `*.test.ts` or `*.test.mjs`, with `*.e2e.test.ts` and `*.integration.test.mjs` for specialized suites.
- Avoid unrelated refactors.
- Remove dead code instead of leaving unused paths.
- Keep implementations simple.
- Comments explain edge cases only (traps, invariants, third-party quirks). Code already says what it does; if a comment is required to understand the code, rename or simplify instead.

---

# Workflow

Do not add or run frontend automated tests, including tests for application composables and shared UI/composables packages. Validate frontend changes with linting, formatting, typechecking, and builds. Keep backend tests.

When working on this repository:

1. Identify the affected application(s).
2. Read the corresponding project instructions, design and architecture documents.
3. Follow repository conventions.
4. Run formatting and linting before considering the task complete.

Find executable checks in the current package scripts. Use pnpm. Common checks
are `pnpm lint`, `pnpm fmt:check` and the affected app's tests/typecheck. Backend
architecture, contract and integration checks are documented in
`apps/back/ARCHITECTURE.md`. UI changes need evidence from the affected page when
local services and browser tools are available.

---

# References

- `README.md` — Human onboarding
- `apps/front/DESIGN.md` — Human design documentation
- `DESIGN.md` — Design scope and application-specific references
- `apps/back/ARCHITECTURE.md` — Backend boundaries and verification
- `docs/PRODUCT.md` — sarpbc.org product context
