---
name: geist-design
description: >-
  Vercel Geist design system, Design Engineer principles, and Web Interface
  Guidelines adapted for sarpbc (Nuxt 4 + @nuxt/ui + NestJS). Use when building
  or reviewing UI components, pages, forms, copy, accessibility, motion, or API
  error messages that surface in the frontend.
metadata:
  author: sarpbc
  version: "1.0.0"
  sources:
    - https://vercel.com/design
    - https://vercel.com/design/engineer
    - https://vercel.com/design/guidelines
---

# Geist Design (sarpbc)

Unified design-engineering guide for **apps/front** (Nuxt, `@nuxt/ui` v4, Tailwind v4, i18n en/fr) and **apps/back** (NestJS API messages consumed by the UI).

## When to Apply

- Creating or refactoring Vue pages, layouts, and components in `apps/front`
- Reviewing UX, accessibility, forms, loading/error/empty states
- Writing user-facing copy (UI strings, toasts, errors, placeholders)
- Shaping NestJS validation or exception messages shown in the frontend
- Auditing interactions: keyboard, focus, URL state, SSR/hydration

## Rule Categories

| Priority | Category | Prefix | Impact |
|----------|----------|--------|--------|
| 1 | Design Engineer Mindset | `de-` | CRITICAL |
| 2 | Geist Visual System | `geist-` | HIGH |
| 3 | Interactions & A11y | `ui-` | HIGH |
| 4 | Content & Copy | `copy-` | HIGH |
| 5 | Forms | `form-` | HIGH |
| 6 | Performance & SSR | `perf-` | HIGH |
| 7 | NestJS ↔ UI Contract | `api-` | MEDIUM |

## Quick Reference

### Design Engineer (`de-`)

- `de-usefulness` — Solve real user problems; scope small enough to ship well
- `de-whole-experience` — Design every state: empty, loading, error, dense, sparse
- `de-constraints` — Know product, code, and tradeoffs before picking a solution
- `de-accessible-by-default` — Complexity available, not required
- `de-craft` — Push back when clarity, performance, or trust is at risk

### Geist Visual (`geist-`)

- `geist-tokens` — Use design tokens, not ad-hoc hex/spacing; see [tokens.md](references/tokens.md)
- `geist-typography` — Semantic text roles (`text-sm text-muted`, headings with tight tracking)
- `geist-surfaces` — Hierarchy via borders and tonal surfaces before heavy shadows
- `geist-motion` — Motion only when it clarifies change; honor `prefers-reduced-motion`
- `geist-components` — Prefer `@nuxt/ui` primitives; extend in `app/components/s/`

### Interactions (`ui-`)

- `ui-keyboard` — All flows keyboard-operable; visible `:focus-visible` rings
- `ui-hit-targets` — ≥24px desktop, ≥44px mobile; expand small visual targets
- `ui-links` — `NuxtLink` / `ULink` for navigation, never button-for-link
- `ui-url-state` — Filters, tabs, pagination in URL (`useRoute().query`)
- `ui-optimistic` — Optimistic UI where safe; rollback + clear error on failure
- `ui-loading` — Keep button label during load; skeleton delay ~150–300ms

### Content (`copy-`)

- `copy-actions` — Title Case labels/buttons; verb + noun (`Save Player`, not `OK`)
- `copy-errors` — What happened + what to do next
- `copy-toasts` — Specific outcome, no period, never “successfully”
- `copy-i18n` — All user strings in `i18n/locales/`; use `…` not `...`

### Forms (`form-`)

- `form-labels` — `UFormField` with visible labels; errors next to fields
- `form-submit` — Enable submit until in-flight; disable + spinner while saving
- `form-mobile` — Input font ≥16px on mobile (or accept iOS zoom tradeoff)
- `form-autocomplete` — Meaningful `name` / `autocomplete`; never block paste

### Performance (`perf-`)

- `perf-ssr-safe` — No hydration mismatch; `ClientOnly` when needed
- `perf-data` — `useFetch` / `useAsyncData` patterns; avoid layout thrash
- `perf-lists` — Virtualize or paginate large tables (`UTable` dashboards)

### API ↔ UI (`api-`)

- `api-error-shape` — Actionable `message` from NestJS exceptions for toasts
- `api-validation` — class-validator messages readable in the UI language

## sarpbc Conventions

| Area | Location / pattern |
|------|-------------------|
| Nuxt app | `apps/front/app/` |
| Global UI config | `app/app.config.ts` (`primary: blue`, `neutral: ink`) |
| Global CSS | `app/assets/css/main.css` (`--ui-radius: 0rem`) |
| Custom primitives | `app/components/s/` (`Card`, `cross/Card`, `badge/Live`) |
| Hub row-height lint | `apps/front/scripts/lint-hub-row-heights.mjs` — see [DESIGN.md](../../../apps/front/DESIGN.md) |
| Composables | `app/composables/` |
| i18n | `i18n/locales/en-US.json`, `fr-FR.json` + `$t()` / `$localePath()` |
| API base | `runtimeConfig.public.apiBase` → NestJS `apps/back` |
| Toasts | `app.config.ts` toaster + `useToast()` |

Stack-specific patterns: [nuxt-sarpbc.md](references/nuxt-sarpbc.md)

## How to Use

1. Read **GUIDE.md** for the full rule set with incorrect/correct examples (on demand).
2. For token mapping (Geist → Tailwind / Nuxt UI): [tokens.md](references/tokens.md).
3. For page/component work in this repo: [nuxt-sarpbc.md](references/nuxt-sarpbc.md).
4. Pair with `nuxt` skill for framework APIs and `nestjs-best-practices` for backend structure.

## UI Review Checklist

```
- [ ] Empty, loading, error states designed
- [ ] Keyboard + focus-visible on all interactives
- [ ] Copy in i18n files; Title Case actions; ellipsis …
- [ ] NuxtLink for nav; URL reflects filter/tab state
- [ ] UFormField labels; field-level errors; submit loading state
- [ ] No hydration warnings; images sized (no CLS)
- [ ] prefers-reduced-motion respected
- [ ] API errors actionable when shown in toasts
```

## Full Compiled Document

For the complete guide: **GUIDE.md**
