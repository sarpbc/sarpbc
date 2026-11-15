import { defineComponent, h, inject } from "vue";

import type { Component, InjectionKey } from "vue";

/*
 * The library renders no icon set and knows no router. Each app provides the
 * components that do (Nuxt's <Icon> and <NuxtLink>); the catalog provides
 * stand-ins. Icon components receive `name`; link components receive `to`.
 */
export interface DesignAdapters {
  icon: Component;
  link: Component;
}

const PlainIcon = defineComponent({
  name: "SbPlainIcon",
  props: { name: { required: true, type: String } },
  setup: (props) => () => h("span", { "aria-hidden": "true", "data-icon": props.name }),
});

/** A plain anchor, for apps or demos without a router. */
export const AnchorLink = defineComponent({
  name: "SbAnchorLink",
  props: { to: { required: true, type: String } },
  setup:
    (props, { slots }) =>
    () =>
      h("a", { href: props.to }, slots.default?.()),
});

export const DESIGN_ADAPTERS: InjectionKey<DesignAdapters> = Symbol("sarpbc-design-adapters");

export const useDesignAdapters = (): DesignAdapters =>
  inject(DESIGN_ADAPTERS, { icon: PlainIcon, link: AnchorLink });
