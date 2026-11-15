# catalog

Internal component catalog for sarpbc.org. It runs on Vite and Vue only, without Nuxt, Tailwind or Nuxt UI.

```sh
pnpm --filter catalog dev   # http://localhost:4100
```

The home page inventories every Nuxt UI component, composable and type used by `apps/front`, `apps/admin` and `packages/ui`. The inventory is scanned from source when the page loads, so it tracks the migration away from Nuxt UI without a generated file. Each component page lists the props, static values, slots and events the apps pass, which is the API its replacement has to cover.

Each component page also shows its production styles, per app. The catalog loads the generated Nuxt UI theme (`apps/front/.nuxt/ui/<name>.ts`), extends it with the app's `app.config.ts` and the color layer Nuxt UI injects at runtime, and renders it through tailwind-variants for every combination of props the source actually passes. It then compiles each resulting Tailwind class to CSS with the app's own stylesheet and resolves every CSS variable it uses to its light and dark value. Run `nuxt prepare` (the apps' `postinstall`) first so the `.nuxt/ui` themes exist.

The `@sarpbc/design` section holds one parity page per new component. Each row is a look production renders: on the left, Nuxt UI's resolved classes with the app's compiled Tailwind CSS, isolated in a shadow root; on the right, the new component with the same props and sample content.
