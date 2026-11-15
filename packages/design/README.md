# @sarpbc/design

sarpbc.org's own component library, which replaced Nuxt UI. Tailwind remains in the apps for page layout utilities. Components are plain Vue with scoped CSS and no runtime styling dependency.

## Rules

- Every variant is a decision, not an option. The UI is dense: `sm` sizes are for tables and toolbars, and nothing is larger than `md`.
- Tokens live in `src/styles/tokens.css` as `--sb-*` custom properties named by role (`--sb-bg-elevated`, `--sb-text-muted`), never by value. Dark mode follows the `.dark` class the apps' color mode sets on `<html>`.
- Buttons and fields share one text size (`--sb-control-text`, 13px) and fixed heights: `sm` 24px, `md` 28px. Sizes change only the height and side padding, and a field is as tall as a `md` button.
- Props are closed unions from `src/types.ts`. Color is never free: a button is blue or grey because of its role, and red only when `danger`.
- The library renders no icon set and knows no router. Hosts provide both through `DESIGN_ADAPTERS`:

```ts
import { DESIGN_ADAPTERS } from "@sarpbc/design";
import "@sarpbc/design/tokens.css";

app.provide(DESIGN_ADAPTERS, { icon: Icon, link: NuxtLink });
```

## Components

| Component        | API                                                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `Avatar`         | `alt` (initials fallback), `src`, `icon`, `size`: xs, sm, lg                                                                               |
| `Badge`          | `color`: neutral, info, success, warning, danger · one look, one size                                                                      |
| `Breadcrumb`     | `items`: label and optional `to`; the last is the current page                                                                             |
| `Button`         | `variant`: primary, secondary, tertiary · `danger` · `size`: sm, md · icon-only is square                                                  |
| `Checkbox`       | `v-model` · `label`, `disabled`                                                                                                            |
| `Combobox`       | `v-model`, `v-model:search-term` · `items`, `multiple`, `remote`, `loading`, `placeholder`                                                 |
| `CommandPalette` | `groups` of items · `v-model:search-term`, `placeholder`, `empty`, `loading`; a group can be `remote`                                      |
| `DropdownMenu`   | `items`: groups of actions (`label`, `icon`, `danger`, `onSelect`) · `align` · default slot is the trigger                                 |
| `FormField`      | `label`, `required`, `hint`, `description`, `help`, `error`; wires id and aria to inputs                                                   |
| `HoverCard`      | `v-model:open` · `side`, `align`; a tap toggles it on touch screens                                                                        |
| `Input`          | One look · `icon`, `trailingIcon`, `loading`                                                                                               |
| `InputNumber`    | `v-model` · `min`, `max`, `step`, `grouping`                                                                                               |
| `Kbd`            | `size`: sm, md                                                                                                                             |
| `Link`           | `to` · `variant`: muted, inline, accent                                                                                                    |
| `Modal`          | `title` (required), `description`, `dismissible`, `size`: md, lg, xl, 2xl · slots `body`, `footer`, `content`; default slot is the trigger |
| `NavigationMenu` | `items` · `orientation`: horizontal, vertical                                                                                              |
| `Pagination`     | `v-model:page` · `total`, `itemsPerPage`                                                                                                   |
| `Popover`        | `v-model:open` · `side`, `align`, `dismissible`                                                                                            |
| `Radio`          | `value` · `label`, `description`, `status`: success, danger; inside a `RadioGroup`                                                         |
| `RadioGroup`     | `v-model` · `items`, `variant`: list, cards · `orientation`; the way to pick one option among several                                      |
| `Select`         | `v-model` · `items` or `groups`, `placeholder`, `loading`                                                                                  |
| `Separator`      | `orientation`, `label`                                                                                                                     |
| `Skeleton`       | Sized by the caller                                                                                                                        |
| `Slideover`      | `v-model:open` · `title` (required), `description`, `side`: left, right                                                                    |
| `Spinner`        | One look                                                                                                                                   |
| `Switch`         | `v-model` · `label`, `description`                                                                                                         |
| `Table`          | TanStack `columns` and `data` · `loading`, `sticky`, `@select` · slots `<id>-cell`, `empty`                                                |
| `Tabs`           | `v-model` · `items`, `ariaLabel`                                                                                                           |
| `Textarea`       | One look · `autoresize`                                                                                                                    |
| `Toaster`        | Renders the toasts raised by `useToast()`; `color`: success, info, warning, danger                                                         |
| `Tooltip`        | `text` · `side`                                                                                                                            |

`apps/catalog` is a playground for every component.

## In the Nuxt apps

`@sarpbc/ui` wires the library into `apps/front` and `apps/admin`: it registers the components as `Sb*` (`<SbButton>`), loads the tokens, provides `<Icon>` and `<NuxtLink>` as adapters, and declares the cascade layer order so the `components` layer stays above Tailwind's preflight and below its utilities.

Front and admin share one look: the font, the `ink` scale, the surfaces, links and focus rules live in `packages/ui/src/runtime/theme.css`, and neither app overrides the design tokens.
