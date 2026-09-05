const apiBase =
  process.env.NUXT_PUBLIC_API_BASE || process.env.API_BASE || "https://api.sarpbc.org";
const adminUrl =
  process.env.NUXT_PUBLIC_ADMIN_URL || process.env.ADMIN_URL || "https://admin.sarpbc.org";

function apiOrigin(base: string): string | undefined {
  try {
    return new URL(base).origin;
  } catch {
    return undefined;
  }
}

const apiOriginUrl = apiOrigin(apiBase);

const contentSwr = { swr: 300 } as const;
const isProduction = process.env.NODE_ENV === "production";
const posthogPublicKey = isProduction ? process.env.NUXT_PUBLIC_POSTHOG_PROJECT_TOKEN || "" : "";
const posthogHost = process.env.NUXT_PUBLIC_POSTHOG_HOST || "https://t.sarpbc.org";

function hostnameFromUrl(base: string | undefined): string | undefined {
  if (!base) {
    return undefined;
  }
  try {
    return new URL(base).hostname;
  } catch {
    return undefined;
  }
}

const r2ImageHost = hostnameFromUrl(process.env.NUXT_PUBLIC_R2_PUBLIC_BASE_URL);

const apiHeadLinks = apiOriginUrl
  ? ([
      { rel: "preconnect", href: apiOriginUrl, crossorigin: "anonymous" },
      { rel: "dns-prefetch", href: apiOriginUrl },
    ] as const)
  : [];

export default defineNuxtConfig({
  app: {
    head: {
      charset: "utf-8",
      viewport: "width=device-width, initial-scale=1",
      link: [
        ...apiHeadLinks,
        { rel: "preload", href: "/sarpbc.svg", as: "image", type: "image/svg+xml" },
      ],
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

  mdc: {
    components: {
      map: {
        player: "SarpPlayerTag",
        team: "SarpTeamTag",
        tweet: "SarpTweetTag",
      },
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

  image: {
    domains: ["cdn.pandascore.co", "imagedelivery.net", ...(r2ImageHost ? [r2ImageHost] : [])],
  },

  icon: {
    clientBundle: {
      scan: true,
      sizeLimitKb: 512,
      icons: [
        "fluent:text-align-justify-24-regular",
        "fluent:dismiss-24-regular",
        "fluent:trophy-24-regular",
        "fluent:weather-moon-24-regular",
        "fluent:weather-sunny-24-regular",
        "ri:twitter-x-fill",
      ],
    },
  },

  modules: [
    "@sarpbc/composables",
    "@sarpbc/ui",
    "evlog/nuxt",
    "@nuxtjs/i18n",
    "@nuxt/ui",
    "@nuxt/content",
    "@nuxt/image",
  ],

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
    vite: {
      esbuild: {
        drop: ["debugger"],
        pure: ["console.debug", "console.log"],
      },
    },
    nitro: {
      esbuild: {
        options: {
          drop: ["debugger"],
          pure: ["console.debug", "console.log"],
        },
      },
    },
  },

  nitro: {
    preset: "node-server",
    compressPublicAssets: {
      gzip: true,
      brotli: true,
    },
  },

  ssr: true,

  typescript: {
    typeCheck: false,
  },

  routeRules: {
    "/login": { appLayout: "login" },
    "/fr/login": { appLayout: "login" },
    "/register": { appLayout: "login" },
    "/fr/register": { appLayout: "login" },
    "/about": { appLayout: "marketing", ...contentSwr },
    "/fr/about": { appLayout: "marketing", ...contentSwr },
    "/privacy-policy": contentSwr,
    "/fr/privacy-policy": contentSwr,
    "/terms-of-service": contentSwr,
    "/fr/terms-of-service": contentSwr,
    "/legal-notice": contentSwr,
    "/fr/legal-notice": contentSwr,
    "/cookie-policy": contentSwr,
    "/fr/cookie-policy": contentSwr,
  },

  runtimeConfig: {
    public: {
      apiBase: apiBase,
      adminUrl: adminUrl,
      posthog: {
        publicKey: posthogPublicKey,
        host: posthogHost,
      },
    },
  },

  experimental: {
    writeEarlyHints: false,
    viewTransition: true,
  },

  vite: {
    define: {
      __VUE_PROD_DEVTOOLS__: false,
    },
    server: {
      watch: {
        usePolling:
          process.env.CHOKIDAR_USEPOLLING === "true" || process.env.CHOKIDAR_USEPOLLING === "1",
        interval: 1000,
      },
    },
    optimizeDeps: {
      include: ["@internationalized/date", "@vueuse/core", "zod"],
    },
  },
});
