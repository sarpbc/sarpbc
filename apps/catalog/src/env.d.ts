declare module "virtual:nuxt-ui-inventory" {
  import type { Inventory } from "#inventory-types";

  const inventory: Inventory;
  export default inventory;
}

declare module "virtual:nuxt-ui-styles" {
  import type { NuxtUiStyles } from "#styles-types";

  const styles: NuxtUiStyles;
  export default styles;
}

declare module "*.vue" {
  import type { DefineComponent } from "vue";

  const component: DefineComponent;
  export default component;
}
