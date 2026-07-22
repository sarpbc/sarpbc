// https://nuxt.com/docs/api/configuration/nuxt-config
const apiBase =
  process.env.NUXT_PUBLIC_API_BASE || process.env.API_BASE || "https://api.sarpbc.org";

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
      title: "SARPBC Admin",
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

  modules: ["@nuxtjs/i18n", "@nuxt/ui"],

  nitro: {
    preset: "node-server",
  },

  // Staff console is SPA-only (parity with former /dashboard island)
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
    },
  },

  vite: {
    define: {
      __VUE_PROD_DEVTOOLS__: false,
    },
  },
});
