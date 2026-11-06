import type { NuxtConfig } from "nuxt/schema";
import { localizedPath } from "@sarpbc/utils/entity-path";

const apiBase = process.env.NUXT_PUBLIC_API_BASE || "https://api.sarpbc.org";
const adminUrl = process.env.NUXT_PUBLIC_ADMIN_URL || "https://admin.sarpbc.org";

function apiOrigin(base: string): string | undefined {
  try {
    return new URL(base).origin;
  } catch {
    return undefined;
  }
}

const apiOriginUrl = apiOrigin(apiBase);

const contentSwr = { swr: 300 } as const;

type RouteRules = NonNullable<NuxtConfig["routeRules"]>;

function localizedRouteRules(rules: RouteRules): RouteRules {
  return Object.fromEntries(
    Object.entries(rules).flatMap(([path, rule]) => [
      [path, rule],
      [localizedPath(path, "fr"), rule],
    ]),
  );
}
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
      link: [
        ...apiHeadLinks,
        { rel: "preload", href: "/sarpbc.svg", as: "image", type: "image/svg+xml" },
      ],
    },
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
        matches: "NewsMatchBlock",
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

  routeRules: localizedRouteRules({
    "/login": { appLayout: "login" },
    "/register": { appLayout: "login" },
    "/game/career": { appLayout: "game" },
    "/game/career/**": { appLayout: "game" },
    "/about": { appLayout: "marketing", ...contentSwr },
    "/brand": { appLayout: "marketing", ...contentSwr },
    "/privacy-policy": contentSwr,
    "/terms-of-service": contentSwr,
    "/legal-notice": contentSwr,
    "/cookie-policy": contentSwr,
  }),

  runtimeConfig: {
    indexnowKey: "",
    apiBaseServer: "",
    apiInternalToken: "",
    public: {
      apiBase: apiBase,
      adminUrl,
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
