import type { StaticProp } from "../inventory/types.ts";

export const STYLED_APPS = ["front", "admin"] as const;

export type StyledApp = (typeof STYLED_APPS)[number];

export interface SlotClasses {
  classes: string;
  slot: string;
}

/** One rendered look: every call whose variant props resolve to the same classes. */
export interface StyleVariant {
  count: number;
  /** Variant props bound to expressions, so production may render another look. */
  dynamic: string[];
  props: StaticProp[];
  slots: SlotClasses[];
}

export interface ClassRule {
  className: string;
  css: string;
}

export interface TokenValue {
  dark: string;
  light: string;
  name: string;
}

export interface ComponentStyles {
  app: StyledApp;
  component: string;
  overridden: boolean;
  rules: ClassRule[];
  theme: string;
  tokens: TokenValue[];
  variants: StyleVariant[];
}

/** Everything Tailwind emits for one app's Nuxt UI classes, used to render reference looks. */
export interface AppStylesheet {
  app: StyledApp;
  css: string;
}

export interface NuxtUiStyles {
  components: ComponentStyles[];
  stylesheets: AppStylesheet[];
}
