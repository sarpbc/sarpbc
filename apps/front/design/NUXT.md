# Nuxt Patterns — sarpbc.org

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

| Module          | Role                                              |
| --------------- | ------------------------------------------------- |
| `@nuxt/ui`      | Components, forms, tables, toaster                |
| `@nuxtjs/i18n`  | en/fr, `prefix_except_default`, `$localePath`     |
| `@nuxt/content` | News/content pages                                |
| `motion-v/nuxt` | Animations (use sparingly per Geist motion rules) |

## Page Meta & SEO

```vue
<script setup lang="ts">
const { t } = useI18n();
useSeoMeta({
  title: () => t("page.players.title"),
  description: () => t("page.players.description"),
});
</script>
```

Use `composables/seo.ts` patterns when they exist. Accurate `<title>` per context.

## Auth & API Calls

```vue
await apiFetch("/resource", { method: "POST", body: payload });
```

`apiFetch` uses the public API origin in the browser and `runtimeConfig.apiBaseServer` during SSR when `NUXT_API_BASE_SERVER` is set. Keep `runtimeConfig.public.apiBase` for URLs the browser must request itself (OAuth redirects, images).

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

| Component        | Use                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------ |
| `SCard`          | Bordered container                                                                         |
| `SCrossCard`     | Auth/marketing cards with cross motif                                                      |
| `SBadgeLive`     | Live status with redundant text                                                            |
| `SLink`          | Styled internal links                                                                      |
| `SListItem`      | Hub list row (`size`: compact/default/header/double; optional `to`, `divider`)             |
| `SRail`          | Caption band + body. `caption="lead"` (72px, first in column) or `section` (44px, default) |
| `SHubColumn`     | Hub grid column (`rail` \| `main`)                                                         |
| `SHubPageHeader` | List-page title band                                                                       |
| `SHubPageBody`   | Detail-page shell aligned with both sidebar cards                                          |

Extend here when the same pattern appears 3+ times.

## Tournament display names

An **event** is one PandaScore serie or one manual tournament. Each `Tournament` is a **stage** of an event and carries:

- `event.name` — the event title, computed by the API (e.g. `RLCS Major Paris 2026`)
- `name` — the stage within the event (e.g. `Playoffs`, `Group Stage`)
- `event.slug` and `slug` — frozen URL segments for the event and the stage

Rules:

- Event titles (trophy cabinets, FAQ answers, the tournaments header, awards, list captions) use `event.name`. Never use raw `tournament.name` alone for an event title; it is usually a stage name.
- A label naming one stage (match groups, match pages, calendar feeds, stage SEO titles) uses `tournamentStageLabel()` from `app/utils/tournamentStageLabel.ts`. It joins the event and stage names without repeating a stage the event is named after.
- Links use `tournamentEventPath(event.slug)` and `tournamentStagePath(event.slug, slug)` from `@sarpbc/utils`; the stage matches tab appends `/matches`. Never build `/tournaments/${id}`. Pick'em pages (`/game/pickems/{id}`) and calendar feeds (`/calendar/tournament/{id}.ics`) stay id-based.
- The API computes slugs and event names. Do not import slug builders into the front.

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

- **root AGENTS.md frontend guidance** — `useFetch`, routing, SSR hydration
- **apps/back/ARCHITECTURE.md** — API validation, DTOs, exception filters
- **INTERFACE.md** — copy, a11y, visual rules
