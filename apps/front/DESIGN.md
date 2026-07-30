# sarpbc front — Design

Human-facing design reference for **`apps/front`** (public site). Use this when shipping UI by hand. Agents should prefer [`.agents/skills/geist-design/`](../../.agents/skills/geist-design/) and still honor the rules here.

Inspired by [Geist](https://vercel.com/design), Linear, and Polar-style product docs: decisions written down, not tribal knowledge.

---

## Principles

1. **Useful first** — every surface makes the next action obvious (follow a match, read news, play Air Riddle).
2. **Borders before shadows** — hierarchy comes from `border-default` and tonal surfaces (`bg-default`, `bg-elevated`), not heavy elevation.
3. **One composition** — hub pages read as a dense, aligned grid; marketing pages read as editorial. Don't mix modes on the same route.
4. **Tokens over magic** — named row heights and semantic colors. Never invent one-off heights like `h-11.25` or `py-[2.75px]`.
5. **Bilingual by default** — all user-facing copy in `i18n/locales/en-US.json` and `fr-FR.json`.
6. **Accessible defaults** — keyboard, visible focus, redundant status (not color alone), stable loading skeletons.

---

## Surfaces

sarpbc has two public design modes. Same tokens and components; different density and layout.

| Mode          | Routes                                                                               | Layout                                           | Density                    | Job                                          |
| ------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------ | -------------------------- | -------------------------------------------- |
| **Hub**       | `/`, `/matches`, `/news`, `/forum`, `/player`, `/team`, `/tournaments`, `/game/*`, … | Default 3-column shell (`layouts/default.vue`)   | Dense, border-aligned rows | Daily returning fans — news, schedule, rails |
| **Marketing** | `/about` (planned)                                                                   | Dedicated marketing layout — **no** hub sidebars | Editorial, more whitespace | First-time visitors — what sarpbc is         |

### Hub (default)

- Shell: `NavHeader` → 12-col grid (match rail | main | forum/game rail) → `NavFooter`.
- Columns share a **row rhythm** via fixed-height primitives (see [Grid module](#grid-module)). Align with tokens + column wrappers — not ad-hoc `mt-*` / `pt-*` tuning between rails.
- Signature motif: `UiCrossCard` / `UiCrossLink` (corner crosses) on title bands and primary list links.
- Homepage (`/`) stays a **news hub**. No marketing hero or pick'em promo as the primary story (product decision 2026-07-30).

### Marketing (`/about`)

- No match lateral bar, no forum preview rail.
- Same color, type, and radius tokens; looser vertical spacing; prose-forward.
- Link from footer (and similar entry points) — not from the homepage feed.

**Rule:** if removing the nav still looks like a generic SaaS landing page, branding is too weak for marketing. If a hub page feels sparse or card-heavy, density is wrong for hub.

---

## Color & theme

Configured in `app/app.config.ts`:

| Intent  | Value  |
| ------- | ------ |
| Primary | `blue` |
| Neutral | `zinc` |

Use semantic classes — not raw hex:

| Intent              | Class                           |
| ------------------- | ------------------------------- |
| Page surface        | `bg-default`                    |
| Subtle fill / hover | `bg-elevated`                   |
| Borders             | `border-default`                |
| Primary action      | `color="primary"` on `@nuxt/ui` |
| Destructive         | `color="error"`                 |

### Text hierarchy (black → white)

Ink strength on light surfaces. Never put caption chrome and list titles on the same step.

| Step (darkest → lightest) | Class              | Approx. role                  | Use                                                 |
| ------------------------- | ------------------ | ----------------------------- | --------------------------------------------------- |
| 1 · Near black            | `text-highlighted` | Emphasis / selected           | Active states, strong headings when needed          |
| 2 · Primary ink           | `text-default`     | Body                          | Default copy                                        |
| 3 · Mid gray              | `text-toned`       | Soft chrome                   | `UiRail` captions (`Recent Activity`)               |
| 4 · Light gray            | `text-muted`       | Nav / meta / dense rail links | Header links, forum rail titles, counts, timestamps |
| 5 · Faintest              | `text-dimmed`      | Disabled / placeholders       | Inactive controls, TBD                              |

**Rail rule (forum):** caption = `text-toned`; row title = `text-muted`; row meta = `text-muted`. Caption stays slightly stronger via `font-medium` + larger `text-sm` vs row `text-xs`.

Note: on zinc, `text-highlighted` ≈ `text-toned` optically — avoid that pairing.

Color signals **state** (live, error, success) — not decoration. One primary action per view.

Radius: `--ui-radius: 0rem` in `app/assets/css/main.css` (sharp corners). Stay consistent; don't mix soft Geist-style radii into hub chrome.

---

## Typography

Prefer system / Nuxt UI sans. Mono for IDs, codes, and aligned stats (`font-mono`, `tabular-nums`).

| Role                  | Classes                                                              |
| --------------------- | -------------------------------------------------------------------- |
| Page title (hub band) | `text-xl font-semibold` inside `h-row-header`                        |
| Section / rail label  | `text-sm font-medium text-toned`                                     |
| Forum rail list links | `text-xs font-normal text-muted`                                     |
| List meta             | `text-xs text-muted`                                                 |
| Marketing H1          | Larger (`text-2xl`–`text-3xl`), `tracking-tight`, more lead-in space |

Don't mix more than two weights in one view. UI labels default to `text-sm` (14px).

---

## Grid module

Hub lists and rails sit on a **4px base** with a modular **row scale**. Tokens live in `app/assets/css/main.css` (`@theme` → Tailwind spacing). Prefer height utilities: `h-row`, `min-h-row`, `h-row-compact`, …

| Token            | CSS variable             | rem       | px  | Utilities (examples)               | Use                                                          |
| ---------------- | ------------------------ | --------- | --- | ---------------------------------- | ------------------------------------------------------------ |
| **row**          | `--spacing-row`          | `2.75rem` | 44  | `h-row`, `min-h-row`               | Default list row, news link band, match row, toolbar         |
| **row-compact**  | `--spacing-row-compact`  | `1.75rem` | 28  | `h-row-compact`                    | Dense rail rows (forum preview, game promo)                  |
| **row-header**   | `--spacing-row-header`   | `3.5rem`  | 56  | `h-row-header`, `min-h-row-header` | Page title band (`UiCrossCard`)                              |
| **row-double**   | `--spacing-row-double`   | `5.5rem`  | 88  | `h-row-double`                     | Rare 2× cells                                                |
| **rail-caption** | `--spacing-rail-caption` | `4.5rem`  | 72  | `h-rail-caption`                   | Section label above a rail card (`flex-col-reverse` caption) |

**States rule:** use these row primitives — not `h-11.25`, `h-11.5`, `h-8.25`, `py-[2.75px]`, or other arbitrary heights.

Legacy → target (migrations under SAR-85):

| Avoid                          | Prefer                                                |
| ------------------------------ | ----------------------------------------------------- |
| `h-11.25`, `h-11.5`            | `h-row`                                               |
| `h-14` (title bands)           | `h-row-header` / `min-h-row-header`                   |
| `md:h-18` (rail labels)        | `h-rail-caption`                                      |
| `py-[2.75px]!` + `leading-5.5` | `h-row-compact` (+ consistent leading)                |
| `max-h-8.25`                   | `h-row-compact` or an explicit compact control height |

Shared list/rail components (`UiListItem`, `UiRail`, `UiHubColumn` — epic SAR-85) encode these sizes so pages don't re-declare heights. `UiListItem` maps `size` prop → row utilities (see below).

---

## Components

Prefer `@nuxt/ui` (`UButton`, `UForm`, `ULink`, `UModal`, `UTable`, …). Extend shared primitives under `app/components/ui/` when a pattern repeats 3+ times.

| Primitive     | Role                                                                   |
| ------------- | ---------------------------------------------------------------------- |
| `UiCard`      | Bordered box (`border-default`)                                        |
| `UiCrossCard` | Hub title band / featured block with corner crosses                    |
| `UiCrossLink` | Cross-motif link wrapper (e.g. news rows)                              |
| `UiLink`      | Styled internal link                                                   |
| `UiListItem`  | Hub list row — fixed row height, optional link + divider               |
| `UiBadgeLive` | Live status with text + color                                          |
| `UiRail`      | Rail section: `h-rail-caption` label band + default slot for card body |
| `UiHubColumn` | Hub grid column wrapper (`variant`: `rail` \| `main`)                  |

#### `UiListItem` sizes

| `size` prop             | Row utilities                        | Token |
| ----------------------- | ------------------------------------ | ----- |
| `compact` (dense rails) | `h-row-compact`, `min-h-row-compact` | 28px  |
| `default`               | `h-row`, `min-h-row`                 | 44px  |
| `header`                | `h-row-header`, `min-h-row-header`   | 56px  |
| `double`                | `h-row-double`, `min-h-row-double`   | 88px  |

Props: `to` (renders `NuxtLink` with hover/focus), `divider` (bottom border + `not-first:-mt-px` for stacked lists). Default slot; override padding via `class` (default `px-2`).

### Rails & list rows

- **Rails** (match lateral, forum preview, game promo): wrap each section in `UiRail` — caption `h-rail-caption` + `text-toned`, then a bordered card/rows stack in the default slot (same idea as match-rail `UiCard`). Forum row titles use `text-muted`.
- **Hub columns**: `layouts/default.vue` wraps columns in `UiHubColumn`. The match rail stays `hidden md:flex` on an outer wrapper (avoid `hidden` vs `flex` clash on the column root). Forum rail uses `variant="rail"` (`mt-4 md:mt-0` for mobile stack). Main uses `variant="main"` (no column top padding — pages own title bands). Desktop caption baselines align via shared `h-rail-caption` on every `UiRail`; do not add per-rail `pt-8` or `md:h-18` offsets.
- **List rows**: `UiListItem` for news (`NewsRow`) and match rows (`MatchRow`, `MatchResultRow`); fixed height from the grid module; stacking borders share edges (`divider` or `border-t-0` on subsequent items) so columns align across the hub.
- **Don't** put marketing cards in the hub hero/main column.

---

## Motion

`motion-v/nuxt` is available. Use motion for **presence and feedback**, not decoration.

| Do                                             | Don't                                      |
| ---------------------------------------------- | ------------------------------------------ |
| Popovers, modals, user-triggered state         | Decorative loops, autoplay attention grabs |
| ~150ms state / ~200ms popover / ~300ms overlay | `transition: all`                          |
| `transform` + `opacity` only                   | Layout-thrashing anims                     |
| Honor `prefers-reduced-motion`                 | Ignore reduced-motion                      |

---

## i18n & copy

- Strings: `i18n/locales/en-US.json` + `fr-FR.json` via `$t()`.
- Links: `$localePath()`.
- Buttons / titles: Title Case. Body / toasts: sentence case.
- Toasts: specific outcome, no trailing period, never “successfully”.
- Errors: what failed + what to do next.
- In-progress: `Saving…` (ellipsis character).
- Units: non-breaking space in locale files (`10\u00a0MB`).

API messages from NestJS often surface in toasts — keep them actionable (see geist-design § NestJS ↔ UI).

---

## Contributing rules

1. Read this file before changing hub chrome, list density, or `/about`.
2. **Hub vs marketing:** pick one mode per route; don't add hub sidebars to marketing or marketing heroes to `/`.
3. **Row heights:** only grid-module utilities — no new arbitrary `h-*` / `py-[…]` for list UI.
4. **Primitives first:** `@nuxt/ui` → existing `Ui*` → new `Ui*` only when reuse is clear.
5. **i18n:** every user-visible string in en + fr.
6. **States:** empty, loading (skeleton matching layout), error, success — before shipping.
7. **Agents:** follow [geist-design](../../.agents/skills/geist-design/); do not paste the full skill into PRs. Point humans at this `DESIGN.md`.
8. **Admin** (`apps/admin`) is a separate surface — out of scope for this doc.

### Docs map

| Audience           | Doc                                                                 |
| ------------------ | ------------------------------------------------------------------- |
| Humans (this file) | `apps/front/DESIGN.md`                                              |
| Agents (UI craft)  | `.agents/skills/geist-design/`                                      |
| Token cheat sheet  | `.agents/skills/geist-design/references/tokens.md`                  |
| Repo / stack index | root [`AGENTS.md`](../../AGENTS.md), [`README.md`](../../README.md) |

---

_Owned with epic [SAR-85](https://linear.app/sarpbc/issue/SAR-85). Grid tokens: `app/assets/css/main.css`._
