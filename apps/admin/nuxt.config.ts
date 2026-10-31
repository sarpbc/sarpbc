import { dirname } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const tiptapPmPath = dirname(dirname(require.resolve("@tiptap/pm/view")));

function prosemirrorAlias(packageName: string) {
  const resolved = require.resolve(packageName, { paths: [tiptapPmPath] });
  return resolved.replace(/index\.cjs$/, "index.js");
}

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

const apiBase =
  process.env.NUXT_PUBLIC_API_BASE || process.env.API_BASE || "https://api.sarpbc.org";
const publicSiteUrl =
  process.env.NUXT_PUBLIC_PUBLIC_SITE_URL ||
  process.env.PUBLIC_SITE_URL ||
  (process.env.NODE_ENV === "production" ? "https://sarpbc.org" : "http://localhost:4000");

function apiOrigin(base: string): string | undefined {
  try {
    return new URL(base).origin;
  } catch {
    return undefined;
  }
}

const apiOriginUrl = apiOrigin(apiBase);

export default defineNuxtConfig({
  app: {
    head: {
      charset: "utf-8",
      viewport: "width=device-width, initial-scale=1",
      title: "sarpbc.org Admin",
      link: apiOriginUrl
        ? [
            { rel: "preconnect", href: apiOriginUrl, crossorigin: "anonymous" },
            { rel: "dns-prefetch", href: apiOriginUrl },
          ]
        : [],
    },
  },

  compatibilityDate: "2026-07-01",

  css: ["~/assets/css/main.css"],

  devServer: {
    port: 4002,
  },

  devtools: { enabled: false },

  i18n: {
    langDir: "locales",
    locales: [
      { code: "en", language: "en", file: "en-US.json", name: "English" },
      { code: "fr", language: "fr", file: "fr-FR.json", name: "Français" },
    ],
    defaultLocale: "en",
    strategy: "prefix_except_default",
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "i18n_redirected",
      redirectOn: "root",
      fallbackLocale: "en",
    },
    compilation: {
      strictMessage: false,
    },
  },

  modules: ["@sarpbc/composables", "@sarpbc/ui", "@nuxtjs/i18n", "@nuxt/ui", "@nuxtjs/mdc"],

  mdc: {
    components: {
      map: {
        player: "SarpPlayerTag",
        team: "SarpTeamTag",
        tweet: "SarpTweetTag",
      },
    },
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
    "/login": { appLayout: "login" },
    "/fr/login": { appLayout: "login" },
    "/**": { appMiddleware: ["admin"] },
  },

  runtimeConfig: {
    public: {
      apiBase: apiBase,
      publicSiteUrl: publicSiteUrl,
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
