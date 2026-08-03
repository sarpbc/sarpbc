# Geist → sarpbc Token Mapping

Maps [Geist](https://vercel.com/design) tokens to **@nuxt/ui v4** + **Tailwind v4** as used in `apps/front`.

## Colors

Nuxt UI exposes semantic colors via `app.config.ts`:

```ts
// app/app.config.ts
ui: {
  colors: {
    primary: "blue",   // Geist blue-700 (#006bff) ≈ Tailwind blue-600/700
    neutral: "ink",    // Custom OKLCH cool charcoal in main.css (@theme static)
  },
}
```

### Text hierarchy

| Geist token | Tailwind / Nuxt UI class | Usage |
|-------------|--------------------------|--------|
| gray-1000 | `text-highlighted`, `font-semibold` | Primary text, headings |
| gray-900 | default foreground | Body primary |
| gray-700 | `text-muted` | Secondary, metadata |
| gray-600 | `text-dimmed` | Disabled, placeholders |

### Surfaces

| Geist token | Class | Usage |
|-------------|-------|--------|
| background-100 | `bg-default` | Page, cards |
| background-200 | `bg-elevated` | Subtle separation only—not general fill |
| gray-alpha-400 | `border-default` | Card borders (`UiCard`) |

### Accents (state only)

| Meaning | Geist | Nuxt UI |
|---------|-------|---------|
| Primary / link / focus | blue-700 | `color="primary"`, `text-primary` |
| Error / destructive | red-800 | `color="error"` |
| Warning | amber-700 | `color="warning"` |
| Success | green-700 | `color="success"` |

Don't use accent color for decoration. One primary action per view.

## Typography

Geist Sans ≈ system / Nuxt UI default sans. Geist Mono ≈ `font-mono`.

| Geist token | Tailwind approximation |
|-------------|------------------------|
| heading-32 | `text-3xl font-semibold tracking-tight` |
| heading-24 | `text-2xl font-semibold tracking-tight` |
| heading-20 | `text-xl font-semibold` |
| heading-16 | `text-base font-semibold` |
| label-14 | `text-sm` |
| copy-16 | `text-base leading-6` |
| copy-14 | `text-sm leading-5` |
| label-14-mono | `text-sm font-mono tabular-nums` |

## Spacing

Geist 4px base = Tailwind default scale.

| Geist | Tailwind |
|-------|----------|
| 1 (4px) | `1` |
| 2 (8px) | `2` |
| 3 (12px) | `3` |
| 4 (16px) | `4` |
| 6 (24px) | `6` |
| 8 (32px) | `8` |
| 10 (40px) | `10` |

Rhythm: `gap-2` in groups, `gap-4`/`mt-4` between groups, `gap-8`/`py-8` between sections.

## Grid module (hub rows)

Named row heights in `apps/front/app/assets/css/main.css` (`@theme` spacing). Human doc: [`apps/front/DESIGN.md`](../../../../apps/front/DESIGN.md).

| Token | Variable | px | Utilities | Use |
|-------|----------|----|-----------|-----|
| row | `--spacing-row` (`2.75rem`) | 44 | `h-row`, `min-h-row` | News link, match row, toolbar |
| row-compact | `--spacing-row-compact` (`1.75rem`) | 28 | `h-row-compact` | Forum rail, game promo |
| row-header | `--spacing-row-header` (`3.5rem`) | 56 | `h-row-header`, `min-h-row-header` | Page title band |
| row-double | `--spacing-row-double` (`5.5rem`) | 88 | `h-row-double` | Rare 2× cells |
| rail-caption | `--spacing-rail-caption` (`4.5rem`) | 72 | `h-rail-caption` | Section label above rail cards |

**Rule:** use these primitives — not `h-11.25`, `h-11.5`, `h-8.25`, or `py-[2.75px]`.

## Radius

| Geist | Value | sarpbc |
|-------|-------|--------|
| sm | 6px | `--ui-radius: 0rem` (sharp)—**project uses zero radius; don't mix** |
| md | 12px | Nuxt UI modal/menu default |
| full | 9999px | `rounded-full` avatars, pills |

## Elevation (light theme)

Prefer borders first. When needed:

```css
/* Raised card */
shadow-sm /* or custom: 0 2px 2px rgba(0,0,0,0.04) */

/* Popover — use Nuxt UI defaults */
```

## Focus ring

Geist: `0 0 0 2px surface, 0 0 0 4px #006bff`. Nuxt UI components include focus styles—don't override unless matching design audit.

## Breakpoints

Geist: sm 401, md 601, lg 961, xl 1200, 2xl 1400.

Tailwind v4 defaults differ—use `sm:`, `md:`, `lg:` consistently with existing pages; verify mobile + laptop + wide.

## Dark theme

Geist dark tokens live at [vercel.com/design.dark](https://vercel.com/design.dark). When adding dark mode to sarpbc, map the same semantic names (`bg-default`, `text-muted`) via Nuxt UI color mode—don't fork per-component colors.
