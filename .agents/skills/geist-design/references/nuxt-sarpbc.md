# Nuxt Patterns — sarpbc

Repo-specific implementation notes for `apps/front`.

## Project Layout

```
apps/front/
├── app/
│   ├── app.vue          # UApp + i18n locale
│   ├── app.config.ts    # UI theme (primary: blue, neutral: ink)
│   ├── assets/css/main.css
│   ├── components/
│   │   ├── ui/          # Shared primitives (Card, badge, link)
│   │   ├── nav/         # Header, footer, bar
│   │   └── …            # Feature components
│   ├── composables/     # useUser, useFetch wrappers, domain logic
│   ├── layouts/         # default, marketing, login
│   ├── middleware/      # auth.global
│   └── pages/           # File-based routing
├── i18n/locales/        # en-US.json, fr-FR.json
└── nuxt.config.ts
```

## Stack Modules

| Module | Role |
|--------|------|
| `@nuxt/ui` | Components, forms, tables, toaster |
| `@nuxtjs/i18n` | en/fr, `prefix_except_default`, `$localePath` |
| `@nuxt/content` | News/content pages |
| `motion-v/nuxt` | Animations (use sparingly per Geist motion rules) |

## Page Meta & SEO

```vue
<script setup lang="ts">
const { t } = useI18n()
useSeoMeta({
  title: () => t('page.players.title'),
  description: () => t('page.players.description'),
})
</script>
```

Use `composables/seo.ts` patterns when they exist. Accurate `<title>` per context.

## Auth & API Calls

```vue
const config = useRuntimeConfig()

await $fetch(`${config.public.apiBase}/resource`, {
  method: 'POST',
  body: payload,
  credentials: 'include',
})
```

- Session via cookies; `getProfile()` in composables
- On error: `useToast()` with actionable message from `error.data?.message`
- Don't expose raw `FetchError` strings without mapping

## Admin Console Patterns

Staff console lives in `apps/admin` (`admin.sarpbc.org`):

- Layout: `default` + `header` (see `apps/admin/app/layouts/`)
- Middleware: `admin` via `routeRules` in `apps/admin/nuxt.config.ts`
- Lists: `UTable` + `UButton` actions + `UModal` for create/edit
- Reference: `apps/admin/app/pages/players/index.vue`

## Custom UI Primitives

Before adding a new primitive, check `app/components/s/`:

| Component | Use |
|-----------|-----|
| `SCard` | Bordered container |
| `SCrossCard` | Auth/marketing cards with cross motif |
| `SBadgeLive` | Live status with redundant text |
| `SLink` | Styled internal links |
| `SButton` | Thin `UButton` wrapper |
| `SListItem` | Hub list row (`size`: compact/default/header/double; optional `to`, `divider`) |
| `SRail` | Caption band + body. `caption="lead"` (72px, first in column) or `section` (44px, default) |
| `SHubColumn` | Hub grid column (`rail` \| `main`) |
| `SHubPageHeader` | List-page title band |
| `SHubPageBody` | Detail-page shell aligned with both sidebar cards |

Extend here when the same pattern appears 3+ times.

## Tournament display names

PandaScore maps to our `Tournament` model as:

- `serie` — event identity (e.g. `Paris 2026`, `Boston Major: Open 2 2026`, or a weak year like `2025`)
- `name` — stage within the event (e.g. `Playoffs`, `Group Stage`)
- `league.name` — competition umbrella (e.g. `RLCS Major`, `RLCS EU`)

User-facing event titles must go through `tournamentEventDisplayName()` in `apps/front/app/utils/tournamentEventDisplayName.ts`:

- Prefix `league.name` when `serie` omits it (e.g. `Paris 2026` → `RLCS Major Paris 2026`)
- When `serie` is year-only, join league + year (e.g. `2025` → `FIFAe World Cup 2025`)
- Never use raw `tournament.name` alone for event titles — it is usually a stage name

Trophy cabinets, player and team FAQ highlights, and similar lists should reuse `displayName` from `usePlayerTrophies` / `useTeamTrophies`, not `serie` or `name` directly.

## i18n Checklist

- [ ] New strings in both `en-US.json` and `fr-FR.json`
- [ ] Links use `$localePath('/path')`
- [ ] Title Case for button keys in English
- [ ] Ellipsis character `…` in loading keys
- [ ] `strictMessage: false` in config—still provide both locales

## SSR / Client Split

```vue
<ClientOnly>
  <BrowserOnlyWidget />
</ClientOnly>
```

Use for: charts, `window` access, heavy client-only editors.

## Route Rules (nuxt.config.ts)

```ts
// apps/front
routeRules: {
  '/login': { appLayout: 'login' },
}

// apps/admin
routeRules: {
  '/login': { appLayout: 'login' },
  '/**': { appMiddleware: ['admin'] },
}
```

Match layout/middleware when adding new auth or staff pages (including `/fr/...` prefix).

## Toaster

Configured in `app.config.ts`:

```ts
toaster: {
  position: 'bottom-right',
  expand: true,
  duration: 5000,
}
```

Toast copy: specific, no period, from i18n where possible.

## Error Page

`error.vue` delegates to `UError`—ensure status codes and messages remain user-friendly for production.

## Pair With

- **nuxt skill** — `useFetch`, routing, SSR hydration
- **nestjs-best-practices** — API validation, DTOs, exception filters
- **geist-design GUIDE.md** — copy, a11y, visual rules
