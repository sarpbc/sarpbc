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

| Mode          | Routes                                                                               | Layout                                         | Density                    | Job                                          |
| ------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------- | -------------------------- | -------------------------------------------- |
| **Hub**       | `/`, `/matches`, `/news`, `/forum`, `/player`, `/team`, `/tournaments`, `/game/*`, … | Default 3-column shell (`layouts/default.vue`) | Dense, border-aligned rows | Daily returning fans — news, schedule, rails |
| **Marketing** | `/about`                                                                             | `layouts/marketing.vue` — **no** hub sidebars  | Editorial, more whitespace | First-time visitors — what sarpbc is         |

### Hub (default)

- Shell: `NavHeader` → 12-col grid (match rail | main | forum/game rail) → `NavFooter`.
- Columns share a **row rhythm** via fixed-height primitives (see [Grid module](#grid-module)). Align with tokens + column wrappers — not ad-hoc `mt-*` / `pt-*` tuning between rails.
- Signature motif: `SCrossCard` (corner crosses) on title bands.
- Homepage (`/`) stays a **news hub**. No marketing hero or pick'em promo as the primary story (product decision 2026-07-30).

### Marketing (`/about`)

- Layout: `layouts/marketing.vue` — `NavHeader`, full-width main (`max-w-7xl`), `NavFooter`; no match lateral bar, no forum preview rail.
- Copy: `content/about/{en|fr}.md` (Nuxt Content) — editorial markdown only.
- Same color, type, and radius tokens; looser vertical spacing; prose-forward.
- Lower density than hub — no `SCrossCard` row-compact lists or hub grid module on marketing routes.
- Link from footer (and similar entry points) — not from the homepage feed.

**Rule:** if removing the nav still looks like a generic SaaS landing page, branding is too weak for marketing. If a hub page feels sparse or card-heavy, density is wrong for hub.

---

## Color & theme

Configured in `app/app.config.ts`:

| Intent  | Value                                             |
| ------- | ------------------------------------------------- |
| Primary | `blue`                                            |
| Neutral | `ink` (custom scale in `app/assets/css/main.css`) |

`ink` is a Linear/Resend-style near-black cool charcoal (canvas `#010101`, surfaces `#080a0d` → `#14171c`) tuned to brand blue `#2B7FFF`.

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
| 3 · Mid gray              | `text-toned`       | Soft chrome                   | `SRail` captions (`Recent Activity`)                |
| 4 · Light gray            | `text-muted`       | Nav / meta / dense rail links | Header links, forum rail titles, counts, timestamps |
| 5 · Faintest              | `text-dimmed`      | Disabled / placeholders       | Inactive controls, TBD                              |

**Rail rule (forum):** caption = `text-toned`; row title = `text-muted`; row meta = `text-muted`. Caption stays slightly stronger via `font-medium` + larger `text-sm` vs row `text-xs`.

Note: on `ink`, keep caption/title steps distinct — avoid pairing `text-highlighted` with `text-toned` on the same density.

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

| Token            | CSS variable             | rem                             | px    | Utilities (examples)               | Use                                                                      |
| ---------------- | ------------------------ | ------------------------------- | ----- | ---------------------------------- | ------------------------------------------------------------------------ |
| **row**          | `--spacing-row`          | `2.75rem`                       | 44    | `h-row`, `min-h-row`               | Default list row, news link band, match row, toolbar                     |
| **row-compact**  | `--spacing-row-compact`  | `calc(row × 2/3)` (~`1.833rem`) | ~29.3 | `h-row-compact`                    | Dense rail rows — **3 compact = 2 row** (forum vs news)                  |
| **row-header**   | `--spacing-row-header`   | `3.5rem`                        | 56    | `h-row-header`, `min-h-row-header` | Page title band (`SCrossCard`)                                           |
| **row-double**   | `--spacing-row-double`   | `5.5rem`                        | 88    | `h-row-double`                     | Rare 2× cells                                                            |
| **row-triple**   | `--spacing-row-triple`   | `calc(row × 3)` (~`8.25rem`)    | ~132  | `h-row-triple`                     | Featured news row with hero thumb (3× default row)                       |
| **row-stack**    | `--spacing-row-stack`    | `calc(row × 6)` (`16.5rem`)     | 264   | `min-h-row-stack`                  | Directory empty/error body                                               |
| **card-s**       | `--spacing-card-s`       | `calc(row × 4 + 1px)`           | 177   | `min-h-card-s`                     | Small padded card (`SCard size="s"`)                                     |
| **card-m**       | `--spacing-card-m`       | `calc(row × 6 + 1px)`           | 265   | `min-h-card-m`                     | Medium padded card (`SCard size="m"`)                                    |
| **card-l**       | `--spacing-card-l`       | `calc(row × 8 + 1px)`           | 353   | `min-h-card-l`                     | Large padded card / forms (`SCard size="l"`)                             |
| **rail-caption** | `--spacing-rail-caption` | `4.5rem`                        | 72    | `h-rail-caption`                   | **Lead** rail only (first in a hub column); = page title 56 + `gap-4` 16 |

Card floors (`card-s` / `card-m` / `card-l`) are **even** multiples of `row` plus **1px**. Even multiples also land on compact rail rows (3 compact = 2 row). The extra pixel is the padded card’s bottom border — flush list cards only have a top border, with the last row’s `border-b` closing the box. `SCard size` applies the matching `min-h-card-*` and `h-row-snap`, which rounds extra growth to `n × row-double + 1px`. List cards (`flushBottom` + `SListItem`) stay content-sized — they are already exact row stacks.

**States rule:** use these row primitives — not `h-11.25`, `h-11.5`, `h-8.25`, `py-[2.75px]`, or other arbitrary heights.

Legacy → target (migrations under SAR-85):

| Avoid                          | Prefer                                                |
| ------------------------------ | ----------------------------------------------------- |
| `h-11.25`, `h-11.5`            | `h-row`                                               |
| `h-14` (title bands)           | `h-row-header` / `min-h-row-header`                   |
| `md:h-18` (rail labels)        | `h-rail-caption`                                      |
| `py-[2.75px]!` + `leading-5.5` | `h-row-compact` (+ consistent leading)                |
| `max-h-8.25`                   | `h-row-compact` or an explicit compact control height |

Shared list/rail components (`SListItem`, `SRail`, `SHubColumn` — epic SAR-85) encode these sizes so pages don't re-declare heights. `SListItem` maps `size` prop → row utilities (see below).

---

## Components

Prefer `@nuxt/ui` (`UButton`, `UForm`, `ULink`, `UModal`, `UTable`, …). Extend shared primitives under `app/components/s/` when a pattern repeats 3+ times.

| Primitive        | Role                                                                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `SCard`          | Bordered box (`border-default`); `flushBottom` for list stacks; `size` `s` \| `m` \| `l` for padded bodies on the row grid               |
| `SCrossCard`     | Hub title band / featured block with corner crosses                                                                                      |
| `SLink`          | Internal link — `variant`: `muted` (nav/meta) or `inline` (entity names). No hover sound.                                                |
| `SButton`        | `UButton` wrapper with Cuelume `pressRelease` + press scale by default (`sound`: `press` \| `toggle` \| `none`; `static` disables scale) |
| `SListItem`      | Hub list row — fixed row height (`h-row` / size tokens), optional link + divider; use with `flushBottom`                                 |
| `SBadgeLive`     | Live status with text + color                                                                                                            |
| `SRail`          | Rail section: caption band + card body. `caption`: `lead` (72px, first in column) \| `section` (44px, default)                           |
| `SHubColumn`     | Hub grid column wrapper (`variant`: `rail` \| `main`)                                                                                    |
| `SHubPageBody`   | Main-column page shell: `SRail caption="lead"` + body gap so first content aligns with sidebar lead rails                                |
| `SHubPageHeader` | List-page title band (`SCrossCard` + `h-row-header`) — use for directory/list hubs, not detail bodies                                    |

#### `SListItem` sizes

| `size` prop             | Row utilities                        | Token      |
| ----------------------- | ------------------------------------ | ---------- |
| `compact` (dense rails) | `h-row-compact`, `min-h-row-compact` | ⅔ of `row` |
| `default`               | `h-row`, `min-h-row`                 | 44px       |
| `header`                | `h-row-header`, `min-h-row-header`   | 56px       |
| `double`                | `h-row-double`, `min-h-row-double`   | 88px       |

Props: `to` (renders `NuxtLink` with hover/focus), `divider` (bottom border — include on every row including last when the parent is `flushBottom`). Default slot; override padding via `class` (default `px-2`).

#### `SCard` sizes

Padded bodies (forms, prose, empty states) — not list stacks.

| `size` prop | Utilities                    | Token         |
| ----------- | ---------------------------- | ------------- |
| `s`         | `min-h-card-s`, `h-row-snap` | 4 × row + 1px |
| `m`         | `min-h-card-m`, `h-row-snap` | 6 × row + 1px |
| `l`         | `min-h-card-l`, `h-row-snap` | 8 × row + 1px |

Omit `size` on `flushBottom` list cards. Prefer `size="l"` over `min-h-row-triple` on forms.

### Rails & list rows

- **Rails** (match lateral, forum preview, game promo): wrap each section in `SRail` — caption `flex-col-reverse pb-1 pl-2` + `text-toned`, then bordered card/rows in the default slot. Use `caption="lead"` on the **first** rail in a hub column (72px / `h-rail-caption`, aligns with `SHubPageHeader` + `gap-4`). Stacked rails and mid-page blocks keep default `caption="section"` (44px / `h-row`). Forum row titles use `text-muted`.
- **Hub columns**: `layouts/default.vue` wraps columns in `SHubColumn`. The match rail stays `hidden md:flex` on an outer wrapper (avoid `hidden` vs `flex` clash on the column root). Forum rail uses `variant="rail"` (`mt-4 md:mt-0` for mobile stack). Main uses `variant="main"` (no column top padding — pages own title bands). Do not add per-rail `pt-8` or `md:h-18` offsets.
- **Detail page bodies**: wrap main-column detail pages in `SHubPageBody` (`SRail caption="lead"` + `gap-4` body). Keep `#caption` empty when used only for rail alignment (match detail). Put the scoreboard / hero / sections in the default slot; secondary meta (tournament, status, format) belongs under the hero card, not in the caption band. Caption is flush above the first body child (no gap) so card tops line up with sidebar cards. Use `captionAlign="center"` (default) or `start` for left labels when caption content is present.
- **List rows**: `SListItem` for news (`NewsRow`) and match rows (`MatchRow`, `MatchResultRow`); fixed height from the grid module. Every row including the last owns `border-b`. Parent list cards use `SCard flush-bottom` so the last row closes the box (no double bottom edge, equal `h-row` heights). Optional footers (forum create post, mobile match “view all”) are extra rows with their own `border-b`, not a `border-t` on a full-border wrapper.
- **Match event groups** (`MatchListGroup`): wrap each tournament in `SRail caption="section"` + `SCard flush-bottom`. Upcoming lists group by local day first (`h-row` date caption above the event rails).
- **Dense data cards** (recent form, head-to-head, results): same `SCard flush-bottom` + `SListItem` stack — **not** `p-4` / nested elevated pills. Wrap titled blocks in `SRail` (default section caption); do not use `section` + `gap-3` + bare `h2`. Reserve padded `SCard` shells (`size="s"` \| `"m"` \| `"l"`) for prose / forms / centered empty states.
- **Discussion threads**: Each comment is a discrete bordered box (header / body / actions), not a divider row in a flush card. Nested replies use `CommentThreadConnector` L-shaped branches with `mt-4` so the elbow meets the child header (`h-8`). Root comments stack with `gap-4`. Composer is its own `SCard`. Primary action is Reply; permalink / report / moderation live in a more-actions popover.
- **Don't** put marketing cards in the hub hero/main column.

### Hub page headers

Hub list pages share chrome via `SHubPageHeader` (`app/components/s/HubPageHeader.vue`):

- Outer shell: `SCrossCard` + `h-row-header` (56px title band).
- Inner layout: centered `h1` (`text-xl font-semibold`) + optional `#meta` slot (`text-sm text-muted`).

Vary **inner content** per hub — not the outer chrome:

| Hub         | Title                          | Meta slot (when data is available) |
| ----------- | ------------------------------ | ---------------------------------- |
| Matches     | `page.matches.title`           | — (live count lives in the list)   |
| Results     | `page.results.title`           | —                                  |
| Tournaments | `page.tournaments.index.title` | Next upcoming event name           |
| Forum       | `page.forum.index.pageTitle`   | Post count                         |
| Pick'ems    | `page.game.pickems.title`      | Open pick'em count                 |
| Players     | Letter or directory title      | Total player count                 |
| Teams       | Letter or directory title      | Total team count                   |

Copy for meta lines: `page.hub.headers.*` in locale files. Keep meta factual — no marketing fluff or eyebrow micro-labels.

---

## Motion

`motion-v/nuxt` is available. Use motion for **presence and feedback**, not decoration.

| Do                                             | Don't                                      |
| ---------------------------------------------- | ------------------------------------------ |
| Popovers, modals, user-triggered state         | Decorative loops, autoplay attention grabs |
| ~150ms state / ~200ms popover / ~300ms overlay | `transition: all`                          |
| `transform` + `opacity` only                   | Layout-thrashing anims                     |
| Honor `prefers-reduced-motion`                 | Ignore reduced-motion                      |
| Interaction sounds (Cuelume)                   | Play when `prefers-reduced-motion: reduce` |

### Interaction sounds (Cuelume)

Pilot UI feedback via [Cuelume](https://cuelume-site.pages.dev/) — Web Audio cues, no audio files. Initialized in `app/plugins/cuelume.client.ts` after hydration; **disabled entirely** when `prefers-reduced-motion: reduce`.

| Pattern       | Attribute convention                                                                                                        | Use                             |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Primary press | `SButton` (default) or `v-bind="cuelumeAttrs.pressRelease"` + `pressClass` (scale `0.96`, transform-only — no layout shift) | Submit / save / comment actions |
| Toggle        | `SButton sound="toggle"` or `v-bind="cuelumeAttrs.toggle"`                                                                  | Theme switch                    |
| Loading       | `playCue("loading")` when user-initiated async work starts (`SButton` also plays when `:loading` becomes true)              | Login, submit, pick'em save     |
| Dense hover   | Do **not** attach hover ticks to `SListItem`, match rows, or nav — they become noise. Press/release on `SButton` only.      | Lists, header, footer           |

Imperative cues: `const { playCue } = useCuelume()` then `playCue('loading')` / `playCue('success')` / `playCue('error')` (e.g. Air Riddle guess feedback). See `app/composables/useCuelume.ts`.

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
3. **Row heights:** only grid-module utilities — no new arbitrary `h-*` / `py-[…]` for list UI. CI enforces this via `scripts/lint-hub-row-heights.mjs` (wired into `pnpm lint`).
4. **Primitives first:** `@nuxt/ui` → existing `S*` (`app/components/s/`) → new `S*` only when reuse is clear.
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
