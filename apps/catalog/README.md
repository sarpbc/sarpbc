# catalog

Internal playground for sarpbc.org's `@sarpbc/design` components. It runs on Vite and Vue only, without Nuxt.

```sh
pnpm --filter catalog dev   # http://localhost:4100
```

Each component has a playground panel where its props and v-model values can be changed live, with the matching call and a log of the events it emits. Components with visual variants also have a Variants tab that shows them side by side.

Playgrounds are declared in `src/playground/playgrounds.ts`. A control's `initial` value is the component's own default, so the call only lists the props that differ from it. Use `required` for a prop the component cannot do without, and `demo` for a control that shapes the sample (its data or wrapper) rather than a prop.
