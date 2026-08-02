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
