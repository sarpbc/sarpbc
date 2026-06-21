// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  app: {
    head: {
      charset: "utf-8",
      viewport: "width=device-width, initial-scale=1",
    },
  },

  build: {
    analyze: false,
  },

  compatibilityDate: "2026-07-01",

  content: {
    experimental: {
      sqliteConnector: "native",
    },
  },

  css: ["~/assets/css/main.css"],

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

  modules: ["evlog/nuxt", "@nuxtjs/i18n", "@nuxt/ui", "@nuxt/content", "motion-v/nuxt"],

  evlog: {
    env: {
      service: "sarpbc-front",
    },
  },

  $production: {
    evlog: {
      console: false,
      sampling: {
        rates: {
          info: 5,
          warn: 50,
          debug: 0,
          error: 100,
        },
        keep: [{ duration: 1000 }, { status: 400 }],
      },
    },
  },

  nitro: {
    preset: "node-server",
  },

  ssr: true,

  typescript: {
    typeCheck: false,
  },

  routeRules: {
    "/dashboard/**": { appLayout: "dashboard", appMiddleware: ["admin"] },
    "/fr/dashboard/**": { appLayout: "dashboard", appMiddleware: ["admin"] },
    "/login": { appLayout: "login" },
    "/fr/login": { appLayout: "login" },
    "/register": { appLayout: "login" },
    "/fr/register": { appLayout: "login" },
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || process.env.API_BASE || "https://api.sarpbc.org",
    },
  },

  experimental: {
    writeEarlyHints: false,
  },

  vite: {
    define: {
      __VUE_PROD_DEVTOOLS__: false,
    },
    server: {
      watch: {
        usePolling: true,
        interval: 1000,
      },
    },
    optimizeDeps: {
      include: ["@internationalized/date", "@vueuse/core", "zod"],
    },
  },
});
