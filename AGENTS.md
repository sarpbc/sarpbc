# sarpbc — Agent Guide

Rocket League news and data platform. Monorepo: **Nuxt 4** frontend + **NestJS** API.

> This file is the **index**. Detailed rules live in `.agents/skills/` — load the relevant skill instead of guessing.

## Repository Layout

| Path          | Stack                                         | Port (local) |
| ------------- | --------------------------------------------- | ------------ |
| `apps/front/` | Nuxt 4, `@nuxt/ui`, Tailwind v4, i18n (en/fr) | 4000         |
| `apps/back/`  | NestJS, MikroORM, PostgreSQL, Redis           | 4001         |

Root scripts: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm fmt`, `pnpm test:back`.

## Skills — When to Use

| Skill                                  | Path                                                 | Use when                                                                      |
| -------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| **geist-design**                       | `.agents/skills/geist-design/`                       | UI, UX, components, forms, copy, a11y, toasts, API error text shown in the UI |
| **nestjs-best-practices**              | `.agents/skills/nestjs-best-practices/`              | NestJS modules, DI, auth, validation, DB, API design, tests                   |
| **nuxt**                               | `.agents/skills/nuxt/`                               | Routing, `useFetch`, SSR, Nitro, Nuxt modules, composables                    |
| **improve-codebase-architecture**      | `.agents/skills/improve-codebase-architecture/`      | Architecture review, deepening refactors (explicit request)                   |
| **thermo-nuclear-code-quality-review** | `.agents/skills/thermo-nuclear-code-quality-review/` | Deep code quality audit (explicit request)                                    |
| **grill-me**                           | `.agents/skills/grill-me/`                           | Interview-style plan review (explicit `/grilling`)                            |
| **sarpbc-pm**                          | `.agents/skills/sarpbc-pm/`                          | Roadmap, backlog audit, feature design, scope grilling, Linear tickets        |
| **customer-needs**                     | `.agents/skills/customer-needs/`                     | Interpret feedback; underlying needs vs literal feature requests              |

**Deep dives:** read each skill's `SKILL.md` first, then `AGENTS.md` or `references/` if needed.

## Cross-Cutting Conventions

- **Package manager:** pnpm only (`only-allow` enforced).
- **Linter / formatter:** oxlint, oxfmt — run before considering work done.
- **i18n:** user-facing strings in `apps/front/i18n/locales/` (en-US + fr-FR); use `$t()` and `$localePath()`.
- **API:** frontend calls `runtimeConfig.public.apiBase` (NestJS `apps/back`); cookies for auth.
- **Imports:** top of file; no inline imports unless circular-deps documented.
- **TypeScript:** exhaustive `switch` with `never` in default for unions/enums.
- **Scope:** minimal diffs; match existing patterns; no drive-by refactors.

## Stack Pointers

### Frontend (`apps/front`)

- Config: `nuxt.config.ts`, `app/app.config.ts` (`primary: blue`, `neutral: zinc`).
- Components: prefer `@nuxt/ui` (`UButton`, `UFormField`, `UTable`); shared primitives in `app/components/ui/`.
- Admin: `/dashboard/**` → `dashboard` layout + `admin` middleware.
- Design rules: `.agents/skills/geist-design/AGENTS.md`

### Backend (`apps/back`)

- Feature modules under `src/` (not technical layers).
- DTOs + `ValidationPipe`; guards for auth; exception filters for consistent errors.
- Migrations via MikroORM — never `synchronize: true` in production.
- NestJS rules: `.agents/skills/nestjs-best-practices/AGENTS.md`

## UI ↔ API Contract

Messages from NestJS (`BadRequestException`, class-validator) often appear in toasts or form errors. Write them **actionable** (what failed + what to do). See `geist-design` § NestJS ↔ UI.

## Agent Workflow

1. Identify touched app (`front` / `back` / both).
2. Read the matching skill(s) from the table above.
3. Follow conventions in this file; defer details to skill `AGENTS.md`.
4. Verify: lint, types (front build on CI), relevant tests.

## References

- Human onboarding: [README.md](README.md)
- Geist / UI: [vercel.com/design](https://vercel.com/design), [vercel.com/design/guidelines](https://vercel.com/design/guidelines)
