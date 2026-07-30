# Nuxt Patterns — sarpbc

Repo-specific implementation notes for `apps/front`.

## Project Layout

```
apps/front/
├── app/
│   ├── app.vue          # UApp + i18n locale
│   ├── app.config.ts    # UI theme (primary: blue, neutral: zinc)
│   ├── assets/css/main.css
│   ├── components/
│   │   ├── ui/          # Shared primitives (Card, badge, link)
│   │   ├── nav/         # Header, footer, bar
│   │   └── …            # Feature components
│   ├── composables/     # useUser, useFetch wrappers, domain logic
│   ├── layouts/         # default, dashboard, login
│   ├── middleware/      # auth.global, admin
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

Before adding a new primitive, check `app/components/ui/`:

| Component | Use |
|-----------|-----|
| `UiCard` | Bordered container |
| `UiCrossCard` | Auth/marketing cards with cross motif |
| `UiBadgeLive` | Live status with redundant text |
| `UiLink` | Styled internal links |
| `UiListItem` | Hub list row (`size`: compact/default/header/double; optional `to`, `divider`) |

Extend here when the same pattern appears 3+ times.

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
- **geist-design AGENTS.md** — copy, a11y, visual rules
