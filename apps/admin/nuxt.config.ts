import path from "node:path";
import { createRequire } from "node:module";
import { localizedPath } from "@sarpbc/utils/entity-path";
import { isNonEmptyString } from "@sarpbc/utils/text";
import { DEFAULT_API_BASE, SITE_ORIGIN, apiPreconnectLinks, i18nOptions } from "@sarpbc/ui/config";
import { newsMdcComponents } from "./app/utils/news-mdc-components";

const require = createRequire(import.meta.url);
const tiptapPmPath = path.dirname(path.dirname(require.resolve("@tiptap/pm/view")));

const prosemirrorAlias = (packageName: string) => {
  const resolved = require.resolve(packageName, { paths: [tiptapPmPath] });

  return resolved.replace(/index\.cjs$/u, "index.js");
};

const prosemirrorPackages = [
  "prosemirror-model",
  "prosemirror-state",
  "prosemirror-view",
  "prosemirror-transform",
  "prosemirror-commands",
  "prosemirror-keymap",
] as const;

const prosemirrorAliases = Object.fromEntries(
  prosemirrorPackages.map((name) => [name, prosemirrorAlias(name)]),
);

const apiBase = isNonEmptyString(process.env.NUXT_PUBLIC_API_BASE)
  ? process.env.NUXT_PUBLIC_API_BASE
  : DEFAULT_API_BASE;

const loginRule = { appLayout: "login" } as const;

export default defineNuxtConfig({
  app: {
    head: {
      charset: "utf-8",
      viewport: "width=device-width, initial-scale=1",
      title: "sarpbc.org Admin",
      link: apiPreconnectLinks(apiBase),
    },
  },

  compatibilityDate: "2026-07-01",

  css: ["~/assets/css/main.css"],

  devServer: {
    port: 4002,
  },

  devtools: { enabled: false },

  i18n: i18nOptions,

  modules: ["@sarpbc/composables", "@sarpbc/ui", "@nuxtjs/i18n", "@nuxt/ui", "@nuxtjs/mdc"],

  mdc: {
    components: { map: newsMdcComponents },
  },

  nitro: {
    preset: "node-server",
  },

  // Staff console is SPA-only
  ssr: false,

  typescript: {
    typeCheck: false,
  },

  routeRules: {
    "/login": loginRule,
    [localizedPath("/login", "fr")]: loginRule,
    "/**": { appMiddleware: ["admin"] },
  },

  runtimeConfig: {
    apiBaseServer: "",
    apiInternalToken: "",
    public: {
      apiBase,
      publicSiteUrl: SITE_ORIGIN,
    },
  },

  vite: {
    define: {
      __VUE_PROD_DEVTOOLS__: false,
    },
    resolve: {
      dedupe: [
        "@tiptap/pm",
        ...prosemirrorPackages,
        "prosemirror-schema-list",
        "prosemirror-history",
        "prosemirror-dropcursor",
        "prosemirror-gapcursor",
        "prosemirror-tables",
        "@tiptap/extension-table",
      ],
      alias: prosemirrorAliases,
    },
    optimizeDeps: {
      include: [
        "@tiptap/pm/view",
        "@tiptap/pm/model",
        "@tiptap/pm/state",
        "@tiptap/pm/transform",
        "@tiptap/pm/commands",
        "@tiptap/pm/keymap",
        "@tiptap/pm/schema-list",
        "@tiptap/pm/history",
        "@tiptap/pm/dropcursor",
        "@tiptap/pm/gapcursor",
        "@tiptap/pm/tables",
        "@tiptap/extension-table",
        "prosemirror-model",
        "prosemirror-state",
        "prosemirror-view",
        "prosemirror-transform",
        "prosemirror-commands",
        "prosemirror-keymap",
      ],
    },
  },
});
