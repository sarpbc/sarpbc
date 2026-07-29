// https://nuxt.com/docs/api/configuration/nuxt-config
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

const listHubSwr = { swr: 60 } as const;
const contentSwr = { swr: 300 } as const;
const isProduction = process.env.NODE_ENV === "production";
const posthogPublicKey = isProduction ? process.env.NUXT_PUBLIC_POSTHOG_PROJECT_TOKEN || "" : "";
// Client ingestion goes through the reverse proxy (ad-block resistant)
const posthogHost = process.env.NUXT_PUBLIC_POSTHOG_HOST || "https://t.sarpbc.org";

export default defineNuxtConfig({
  app: {
    head: {
      charset: "utf-8",
      viewport: "width=device-width, initial-scale=1",
      link: apiOriginUrl
        ? [
            { rel: "preconnect", href: apiOriginUrl, crossorigin: "anonymous" },
            { rel: "dns-prefetch", href: apiOriginUrl },
          ]
        : [],
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
    domains: ["cdn.pandascore.co", "imagedelivery.net"],
  },

  modules: [
    "@sarpbc/composables",
    "@sarpbc/ui",
    "evlog/nuxt",
    "@nuxtjs/i18n",
    "@nuxt/ui",
    "@nuxt/content",
    "@nuxt/image",
    "motion-v/nuxt",
    "@posthog/nuxt",
  ],

  posthogConfig: {
    publicKey: posthogPublicKey,
    host: posthogHost,
    clientConfig: {
      api_host: posthogHost,
      ui_host: "https://eu.posthog.com", // toolbar — never the proxy
      capture_exceptions: true,
      __add_tracing_headers: ["localhost", "api.sarpbc.org"],
      loaded: (ph) => {
        if (!isProduction) {
          ph.opt_out_capturing();
          ph.set_config({ disable_session_recording: true, autocapture: false });
        }
      },
    },
    serverConfig: {
      enableExceptionAutocapture: true,
    },
  },

  evlog: {
    env: {
      service: "sarpbc-front",
    },
  },

  $production: {
    // Evlog: never sample debug in production; silence console transport
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
    // Strip debug noise from client + server bundles (keep console.error/warn)
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
  },

  ssr: true,

  typescript: {
    typeCheck: false,
  },

  routeRules: {
    // Auth layouts
    "/login": { appLayout: "login" },
    "/fr/login": { appLayout: "login" },
    "/register": { appLayout: "login" },
    "/fr/register": { appLayout: "login" },

    // Legal — longer SWR (homepage + news stay fresh for editorial updates)
    "/privacy-policy": contentSwr,
    "/fr/privacy-policy": contentSwr,
    "/terms-of-service": contentSwr,
    "/fr/terms-of-service": contentSwr,
    "/legal-notice": contentSwr,
    "/fr/legal-notice": contentSwr,
    "/cookie-policy": contentSwr,
    "/fr/cookie-policy": contentSwr,

    // Public list hubs — short SWR
    "/matches": listHubSwr,
    "/fr/matches": listHubSwr,
    "/tournaments": listHubSwr,
    "/fr/tournaments": listHubSwr,
    "/player": listHubSwr,
    "/fr/player": listHubSwr,
    "/team": listHubSwr,
    "/fr/team": listHubSwr,
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
