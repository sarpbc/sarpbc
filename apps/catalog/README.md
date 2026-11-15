# catalog

Internal playground for sarpbc.org's `@sarpbc/design` components. It runs on Vite and Vue only, without Nuxt.

```sh
pnpm --filter catalog dev   # http://localhost:4100
```

Each component has a playground panel where its props, slots and states can be changed live.

Add `?tuner` to the URL to open the Neutrals tuner, which adjusts the `ink` neutral palette defined in `packages/design/src/styles/tokens.css`.
