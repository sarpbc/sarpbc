# Enforcement Patterns

Concrete ways to turn Orbit principles into a merge contract. Pick what fits the stack; the goal is the same: **off-system styling fails CI**.

## 1. Typed token props (strongest)

Style API (StyleX, vanilla-extract recipes, Restyle-like `Box`) where:

- Spacing/color/radius props accept only unions derived from token maps
- No `className` on the primitive (or `className` is typed to `never` / stripped)
- `as` prop is a closed element union for semantics without open styling

## 2. Semantic utility allowlist (Tailwind / Nuxt UI)

When staying on utilities:

- Prefer semantic classes mapped to CSS variables (`bg-default`, `text-muted`) over palette scales (`bg-zinc-800`)
- Lint or codemod: reject `bg-gray-*`, `bg-zinc-*`, `text-[#…]`, `p-[…]`, `dark:` on colors already covered by tokens
- Prefer `@nuxt/ui` / shared primitives so agents don't invent layout chrome

Example oxlint/ESLint direction (illustrative):

```js
// Reject arbitrary values and non-semantic palette families in app UI
'no-restricted-syntax': [
  'error',
  {
    selector: 'Literal[value=/(?:bg|text|border)-(?:gray|zinc|neutral|slate)-\\d+/]',
    message: 'Use semantic tokens (bg-default, text-muted, …), not palette scales.',
  },
]
```

Prefer dedicated plugins (`eslint-plugin-tailwindcss` / project rules) over fragile regex when available.

## 3. Ban raw layout elements

```js
'project/no-raw-html-layout': 'error',
// message: Use <Box /> / Ui* primitive instead of <div /> for layout.
```

Allow exceptions only for documented cases (third-party slots, SVG, portals). Polymorphic `as="nav" | "ul" | "li" | …` preserves a11y.

## 4. Theme in the token

```css
/* One decision, both themes */
--background-card: light-dark(hsl(…), hsl(…));
```

Or paired semantic vars resolved by `.dark` on a root—still **one** token name at the call site.

## 5. Escape-hatch hygiene

- Count `eslint-disable` / `oxlint-disable` / `@ts-expect-error` on style rules in CI or review
- Rising count ⇒ missing tokens or overly strict rule—fix the system, don't normalize bypasses
- Missing value → open a token PR, don't ship `p-[13px]`

## 6. Incremental adoption

| Phase | Policy |
|-------|--------|
| Legacy files | Untouched until edited |
| Touched files | Convert to tokens/primitives in the same PR when cheap |
| New files | Closed vocabulary only |

## Mapping Polar Orbit → common stacks

| Orbit idea | StyleX + Box | Nuxt UI + Tailwind (sarpbc) |
|------------|--------------|-----------------------------|
| Intent tokens | `backgroundColor="background-card"` | `bg-elevated` / `bg-default`, not `bg-zinc-900` |
| Closed spacing | `padding="m"` | Tailwind scale only; ban arbitrary `p-[…]` |
| No raw div | ESLint `no-raw-html-layout` | Prefer `UCard` / `ui/*`; lint raw layout where practical |
| Dark mode | `light-dark()` in token | Semantic tokens that flip with color mode |
| CI contract | Types + ESLint | oxlint + types + review checklist |

## Failure modes to watch

- Token set too small → constant pressure to bypass (add tokens weekly until friction drops)
- Token set too large → decisions blur; prune unused intent names
- Soft “prefer Nuxt UI” without lint → agents still emit `div` + utility soup
- Document-only rules → drift returns within days of agent volume
