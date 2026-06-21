# Geist Design — sarpbc Agent Guide

**Version 1.0.0** · Sources: [Geist](https://vercel.com/design), [Design Engineer](https://vercel.com/design/engineer), [Web Interface Guidelines](https://vercel.com/design/guidelines)

> Optimized for AI agents working on **apps/front** (Nuxt + `@nuxt/ui`) and **apps/back** (NestJS). Humans may use it too.

---

## Abstract

This guide merges Vercel's design system, design-engineering mindset, and interface guidelines into one actionable reference for the sarpbc monorepo. It prioritizes usefulness, accessibility, and craft while mapping Geist tokens to the project's Nuxt UI + Tailwind stack.

---

## Table of Contents

1. [Design Engineer Mindset](#1-design-engineer-mindset) — CRITICAL
2. [Geist Visual System](#2-geist-visual-system) — HIGH
3. [Interactions & Accessibility](#3-interactions--accessibility) — HIGH
4. [Content & Copy](#4-content--copy) — HIGH
5. [Forms](#5-forms) — HIGH
6. [Layout & Visual Design](#6-layout--visual-design) — MEDIUM
7. [Motion & Animation](#7-motion--animation) — MEDIUM
8. [Performance & SSR (Nuxt)](#8-performance--ssr-nuxt) — HIGH
9. [NestJS ↔ UI Contract](#9-nestjs--ui-contract) — MEDIUM
10. [Review Workflow](#10-review-workflow)

---

## 1. Design Engineer Mindset

**Impact: CRITICAL**

### 1.1 Obsess Over Usefulness (`de-usefulness`)

Solve real problems for players, admins, and teammates. Every surface should make the next action obvious.

**Incorrect:** Decorative dashboard widget with no action path.

**Correct:** Empty tournaments list with copy pointing to the first action and a primary `UButton` to create or sync.

### 1.2 Own the Whole Experience (`de-whole-experience`)

Shape product, interface, and implementation together. Design **all states** before shipping.

| State | Requirement |
|-------|-------------|
| Empty | Explain why empty + primary next step |
| Loading | Skeleton matching final layout; button keeps label + spinner |
| Error | What failed + how to recover |
| Success | Toast names the thing changed (`Player created`) |
| Dense / sparse | Layout survives 1 item and 500 items |

Use `UError` in `error.vue`; page-level error boundaries for feature areas.

### 1.3 Understand Constraints (`de-constraints`)

Before choosing a solution, identify the real constraint:

- **SSR** — data must be consistent server/client (`useFetch`, `useAsyncData`)
- **i18n** — en/fr via `@nuxtjs/i18n`; never hardcode user strings in templates
- **Auth** — cookie session to `apiBase`; `auth.global` + `admin` middleware
- **Admin dashboard** — `routeRules` set `appLayout: dashboard` + `admin` middleware

### 1.4 Build for Everyone (`de-accessible-by-default`)

Progressive disclosure: simple default path, advanced options available but not required. Pair color with text/icons for status (e.g. `UiBadgeLive` + label).

### 1.5 Make It Excellent (`de-craft`)

Scope small enough to polish. Push back on unclear copy, missing focus rings, or hydration bugs. Leave surfaces better than found.

---

## 2. Geist Visual System

**Impact: HIGH**

Geist is minimal, high-contrast, developer-focused: whitespace, restrained color, readable type. Color signals state—not decoration.

### 2.1 Tokens (`geist-tokens`)

Use semantic tokens via Nuxt UI / Tailwind—not raw hex in components.

| Geist intent | sarpbc / Nuxt UI |
|--------------|------------------|
| Primary text | `text-highlighted` or default foreground |
| Secondary text | `text-muted` |
| Disabled | `text-dimmed` / `disabled` variant |
| Page surface | `bg-default` |
| Subtle separation | `bg-elevated`, `border-default` |
| Primary action | `color="primary"` on `UButton` |
| Destructive | `color="error"` |
| Focus ring | Built into `@nuxt/ui` focus styles—don't remove |
| Radius | `--ui-radius: 0.25rem` in `main.css` (tighter than Geist 6px—stay consistent) |

Full mapping: [references/tokens.md](references/tokens.md)

**Incorrect:**
```vue
<p style="color: #4d4d4d; margin-top: 13px">...</p>
```

**Correct:**
```vue
<p class="text-sm text-muted mt-3">...</p>
```

### 2.2 Typography (`geist-typography`)

- **Headings:** `font-semibold` / `font-bold`, tighter tracking on large titles (`tracking-tight`)
- **UI labels:** `text-sm` (14px class) — default for nav, table headers, form labels
- **Body:** `text-base` with comfortable line height
- **Data / codes / IDs:** `font-mono`, `tabular-nums` for aligned numbers
- **Don't** mix more than two weights in one view

```vue
<h1 class="text-2xl font-bold tracking-tight">{{ $t('page.title') }}</h1>
<p class="text-sm text-muted">{{ $t('page.subtitle') }}</p>
```

### 2.3 Surfaces & Elevation (`geist-surfaces`)

Hierarchy: **borders + tonal surfaces first**, shadows second.

- Cards: `border border-default` (see `UiCard`, `UiCrossCard`)
- Popovers/menus: default Nuxt UI elevation
- Avoid heavy shadows on flat dashboard tables

### 2.4 Components (`geist-components`)

**Prefer `@nuxt/ui` primitives** before custom markup:

| Need | Use |
|------|-----|
| Button | `UButton` |
| Form | `UForm`, `UFormField`, `UInput`, `USelect` |
| Table | `UTable` (dashboard lists) |
| Link | `ULink` / `NuxtLink` |
| Modal | `UModal` |
| Toast | `useToast()` |
| Error page | `UError` |

Extend shared patterns in `app/components/ui/` when the same layout repeats.

---

## 3. Interactions & Accessibility

**Impact: HIGH** — [Web Interface Guidelines](https://vercel.com/design/guidelines)

### 3.1 Keyboard & Focus (`ui-keyboard`)

- All flows operable via keyboard (WAI-ARIA patterns)
- Visible focus: rely on `:focus-visible` (Nuxt UI default)—never `outline: none` without replacement
- Modals: trap focus; restore on close
- Icon-only buttons: `aria-label` or visually hidden text

### 3.2 Hit Targets (`ui-hit-targets`)

- Desktop minimum **24×24px**; mobile **44×44px**
- If icon is small, expand clickable area with padding
- `touch-action: manipulation` on tap controls

### 3.3 Links vs Buttons (`ui-links`)

**Incorrect:**
```vue
<UButton @click="navigateTo('/player')">Players</UButton>
```

**Correct:**
```vue
<ULink :to="$localePath('/player')">{{ $t('nav.players') }}</ULink>
```

Supports Cmd/Ctrl+click, middle-click, prefetch.

### 3.4 URL as State (`ui-url-state`)

Persist filters, tabs, pagination in the URL—not orphaned `ref` state.

```vue
const route = useRoute()
const router = useRouter()

const page = computed({
  get: () => Number(route.query.page) || 1,
  set: (p) => router.push({ query: { ...route.query, page: p } }),
})
```

### 3.5 Loading & Optimistic UI (`ui-loading`, `ui-optimistic`)

- Loading buttons: show spinner **and** keep original label (`Saving…`)
- Skeleton show-delay ~150–300ms; min visible ~300–500ms to avoid flicker
- Optimistic updates where success is likely; rollback + toast on failure
- Announce async updates: `aria-live="polite"` for toasts (Nuxt UI toaster)

### 3.6 Other Interaction Rules

| Rule | Implementation |
|------|----------------|
| Don't block paste | Never `@paste.prevent` on inputs |
| Ellipsis for in-progress | `{{ $t('common.saving') }}` → `"Saving…"` in locale file |
| Confirm destructive | `UModal` confirm or undo window |
| Deep-link everything | Tabs, expanded panels, filters in query |
| Respect zoom | Never disable browser zoom |
| Mobile inputs | `text-base` (16px) on mobile inputs to avoid iOS zoom |
| Scroll in modals | `overscroll-behavior: contain` on modal body |

---

## 4. Content & Copy

**Impact: HIGH**

### 4.1 Voice (Geist + Vercel guidelines)

| Context | Style |
|---------|--------|
| Buttons, labels, titles | Title Case (`Save Player`, `Delete Tournament`) |
| Body, helper text, toasts | Sentence case |
| Actions | Verb + noun—not `OK`, `Continue`, bare `Submit` |
| In-progress | Present participle + ellipsis: `Saving…`, `Loading…` |
| Toasts | Specific, no trailing period, never "successfully" |
| Errors | What happened + what to do next |
| Empty states | Why empty + first action |
| Numbers | Numerals: `3 tournaments` |
| Units | Non-breaking space: `10 MB` → use `10\u00a0MB` in i18n |

### 4.2 i18n (`copy-i18n`)

**All user-facing strings** go in `i18n/locales/en-US.json` and `fr-FR.json`.

**Incorrect:**
```vue
<UButton>Save Player</UButton>
```

**Correct:**
```vue
<UButton>{{ $t('dashboard.players.save') }}</UButton>
```

- Use `$localePath()` for internal links (prefix strategy: `prefix_except_default`)
- Shield brand/code from auto-translate: `translate="no"` on tokens, slugs
- Prefer `Accept-Language` / `navigator.languages`—not IP for locale

### 4.3 Examples

| Bad | Good |
|-----|------|
| `Successfully deleted the player.` | `Player deleted` |
| `Invalid input` | `Email format is invalid. Use name@example.com.` |
| `Continue` | `Save API Key` |
| `Error` | `Could not save player. Check the name and try again.` |
| `No data` | `No players yet. Add a player to get started.` |

---

## 5. Forms

**Impact: HIGH**

### 5.1 Structure (`form-labels`)

Use `UForm` + `UFormField` (see `apps/front/app/pages/dashboard/players/index.vue`).

```vue
<UFormField :label="$t('fields.email')" name="email" required>
  <UInput v-model="state.email" type="email" autocomplete="email" />
</UFormField>
```

- Every control has a label (visible or `aria-label`)
- Errors adjacent to the field; on submit, focus first error
- Don't pre-disable submit—let validation surface on attempt

### 5.2 Submission (`form-submit`)

```vue
<UButton type="submit" :loading="pending" :disabled="pending">
  {{ pending ? $t('common.saving') : $t('common.save') }}
</UButton>
```

- Trim trailing whitespace from text inputs before validate
- Allow typing in numeric fields; validate rather than block keys
- `spellcheck="false"` on emails, usernames, codes
- OTP/password fields: allow paste

### 5.3 Auth Forms

Login/register (`login.vue`, `register.vue`): cookie credentials to NestJS auth endpoints. Show API errors via toast with actionable copy.

---

## 6. Layout & Visual Design

**Impact: MEDIUM**

### Spacing (Geist 4px scale)

Use Tailwind spacing: `1`=4px, `2`=8px, `3`=12px, `4`=16px, `6`=24px, `8`=32px.

- **8px** inside a group
- **16px** between groups
- **24–32px** between sections
- Dashboard cards: `p-4`–`p-6`; landing hero: more generous

### Layout

- Center content ~`max-w-7xl` (1200px) on marketing pages
- Dashboard: full-width tables with horizontal scroll when needed
- `min-h-svh` on landing (`main.css` scrollbar-gutter rule applies)
- Respect safe areas on mobile
- Stable skeletons mirroring final content (no CLS)

### Visual polish

- Crisp borders: `border-default` often enough without shadow
- Nested radii: child radius ≤ parent
- `theme-color` meta aligned with `bg-default`
- `color-scheme` for dark mode if/when enabled

---

## 7. Motion & Animation

**Impact: MEDIUM**

Project uses `motion-v/nuxt`—apply Geist motion discipline:

| Use motion | Skip motion |
|------------|-------------|
| Revealing popovers, modals | Decorative loops |
| State feedback users triggered | Autoplay attention grabs |

- Duration: ~150ms state, ~200ms popover, ~300ms overlay
- Easing: `cubic-bezier(0.175, 0.885, 0.32, 1.1)` when animating
- Only `transform` and `opacity`—never `transition: all`
- **Always** `@media (prefers-reduced-motion: reduce)` → instant or fade-only
- Interruptible by user input

---

## 8. Performance & SSR (Nuxt)

**Impact: HIGH**

### 8.1 Data Fetching (`perf-data`)

- Prefer `useFetch` / `useAsyncData` with keys for SSR deduplication
- Parallel fetches with `Promise.all` or multiple `useFetch` calls
- Handle `error` and `pending` in template—don't flash empty then content

### 8.2 Hydration (`perf-ssr-safe`)

- Input values must not change unexpectedly after hydration
- Browser-only APIs in `onMounted` or `<ClientOnly>`
- Match server/client locale and cookie state
- See `nuxt` skill: `best-practices-ssr.md`

### 8.3 Lists & Assets (`perf-lists`)

- Paginate dashboard `UTable` data (align with NestJS `PaginationQueryDto`)
- Set explicit image dimensions (`Player/Img.vue` patterns)
- Lazy-load below-fold images
- `font-variant-numeric: tabular-nums` on stats columns

### 8.4 Network

- `POST/PATCH/DELETE` target <500ms perceived (loading states mandatory)
- Preconnect to `apiBase` origin if on different domain

---

## 9. NestJS ↔ UI Contract

**Impact: MEDIUM**

Frontend consumes **apps/back** REST API. Error and validation copy must work in toasts and inline forms.

### 9.1 Exception Messages (`api-error-shape`)

**Incorrect (NestJS):**
```typescript
throw new BadRequestException('Bad request');
```

**Correct:**
```typescript
throw new BadRequestException(
  'A player with this name already exists. Choose a different name or edit the existing player.',
);
```

Structure for complex errors (optional):
```typescript
throw new BadRequestException({
  message: 'Validation failed',
  errors: [{ field: 'email', message: 'Email is already registered.' }],
});
```

Frontend maps `field` errors to `UFormField` error slots.

### 9.2 Validation Messages (`api-validation`)

```typescript
@IsEmail({}, { message: 'Enter a valid email address (name@example.com).' })
email: string;
```

- Messages readable by end users—not jargon
- Don't leak stack traces or internal IDs in production responses
- Align with `nestjs-best-practices` `security-validate-all-input`

### 9.3 Response DTOs

Use response DTOs / `@Exclude()` so the UI never receives `passwordHash` etc. (`api-use-dto-serialization`).

---

## 10. Review Workflow

When reviewing UI changes:

1. **Mindset** — Useful? All states? Scoped well?
2. **Visual** — Tokens, typography, consistent radius, Nuxt UI primitives
3. **A11y** — Keyboard, focus, labels, live regions
4. **Copy** — i18n, Title Case actions, actionable errors
5. **Forms** — Labels, loading, validation placement
6. **SSR** — No hydration warnings; URL state
7. **API** — Messages work in toasts if surfaced

### Priority Tags for Feedback

- **Critical** — A11y blocker, hydration bug, broken flow
- **Suggestion** — Copy, spacing, missing empty state
- **Nice to have** — Motion polish, optical alignment

---

## References

- [Geist Design System](https://vercel.com/design)
- [Design Engineer Principles](https://vercel.com/design/engineer)
- [Web Interface Guidelines](https://vercel.com/design/guidelines)
- sarpbc: [references/tokens.md](references/tokens.md), [references/nuxt-sarpbc.md](references/nuxt-sarpbc.md)
- Pair with: `nuxt` skill, `nestjs-best-practices` skill

---

*Maintained in `.agents/skills/geist-design/` for sarpbc.*
