# @sarpbc/design

sarpbc.org's own component library, replacing Nuxt UI and Tailwind. Components are plain Vue with scoped CSS and no runtime styling dependency.

## Rules

- Every variant is a decision, not an option. The UI is dense: `sm` sizes are for tables and toolbars, and nothing is larger than `md`.
- Tokens live in `src/styles/tokens.css` as `--sb-*` custom properties named by role (`--sb-bg-elevated`, `--sb-text-muted`), never by value. Dark mode follows the `.dark` class the apps' color mode sets on `<html>`.
- Props are closed unions from `src/types.ts`. Color is never free: a button is blue or grey because of its role, and red only when `danger`.
- The library renders no icon set and knows no router. Apps provide both through `DESIGN_ADAPTERS`:

```ts
import { DESIGN_ADAPTERS } from "@sarpbc/design";
import "@sarpbc/design/tokens.css";

app.provide(DESIGN_ADAPTERS, { icon: Icon, link: NuxtLink });
```

## Components

| Component   | API                                                                                       | Replaces     |
| ----------- | ----------------------------------------------------------------------------------------- | ------------ |
| `Button`    | `variant`: primary, secondary, tertiary · `danger` · `size`: sm, md · icon-only is square | `UButton`    |
| `Badge`     | `color`: neutral, info, success, warning, danger · one look, one size                     | `UBadge`     |
| `Input`     | One look · `icon`, `trailingIcon`, `loading`                                              | `UInput`     |
| `Textarea`  | One look · `autoresize`                                                                   | `UTextarea`  |
| `FormField` | `label`, `required`, `hint`, `description`, `help`, `error`; wires id and aria to inputs  | `UFormField` |
| `Skeleton`  | Sized by the caller                                                                       | `USkeleton`  |
| `Kbd`       | `size`: sm, md                                                                            | `UKbd`       |
| `Separator` | `orientation`                                                                             | `USeparator` |

The catalog's `@sarpbc/design` pages map every look production renders today to its new call. That mapping is the specification for the codemod that migrates the apps.

## Adopting it in an app

`apps/admin` keeps Nuxt UI's default dark surfaces where the front darkens them. When admin adopts the library, its stylesheet declares:

```css
.dark {
  --sb-bg: var(--sb-ink-900);
  --sb-bg-muted: var(--sb-ink-800);
  --sb-bg-elevated: var(--sb-ink-800);
}
```
