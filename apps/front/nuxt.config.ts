import type { NuxtConfig } from "nuxt/schema";
import { SITEMAP_KINDS } from "@sarpbc/types";
import { localizedPath } from "@sarpbc/utils/entity-path";
import { isNonEmptyString } from "@sarpbc/utils/text";
import {
  DEFAULT_API_BASE,
  SITE_ORIGIN,
  apiPreconnectLinks,
  i18nOptions,
  newsMdcComponentMap,
} from "@sarpbc/ui/config";

function envOr(value: string | undefined, fallback: string): string {
  return isNonEmptyString(value) ? value : fallback;
}

const apiBase = envOr(process.env.NUXT_PUBLIC_API_BASE, DEFAULT_API_BASE);
const adminUrl = envOr(process.env.NUXT_PUBLIC_ADMIN_URL, "https://admin.sarpbc.org");

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

const posthogPublicKey = isProduction
  ? envOr(process.env.NUXT_PUBLIC_POSTHOG_PROJECT_TOKEN, "")
  : "";

const posthogHost = envOr(process.env.NUXT_PUBLIC_POSTHOG_HOST, "https://t.sarpbc.org");

function hostnameFromUrl(base: string | undefined): string | undefined {
  if (!isNonEmptyString(base)) {
    return undefined;
  }

  try {
    return new URL(base).hostname;
  } catch {
    return undefined;
  }
}

const r2ImageHost = hostnameFromUrl(process.env.NUXT_PUBLIC_R2_PUBLIC_BASE_URL);

export default defineNuxtConfig({
  app: {
    head: {
      link: [
        ...apiPreconnectLinks(apiBase),
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
    components: { map: newsMdcComponentMap("NewsMatchBlock") },
  },

  css: ["~/assets/css/main.css"],

  devtools: { enabled: false },

  i18n: i18nOptions,

  image: {
    domains: [
      "cdn.pandascore.co",
      "imagedelivery.net",
      ...(isNonEmptyString(r2ImageHost) ? [r2ImageHost] : []),
    ],
  },

  icon: {
    clientBundle: {
      scan: true,
      sizeLimitKb: 512,
      icons: [
        "fluent:text-align-justify-24-regular",
        "fluent:dismiss-24-regular",
        "fluent:eye-24-regular",
        "fluent:eye-off-24-regular",
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
    "@nuxtjs/sitemap",
  ],

  site: {
    url: SITE_ORIGIN,
  },

  sitemap: {
    xsl: false,
    credits: false,
    sitemaps: {
      pages: {
        includeAppSources: true,
        exclude: ["/login", "/register", "/profile", "/forum/new"],
      },
      ...Object.fromEntries(
        SITEMAP_KINDS.map((kind) => [
          kind,
          { sources: [`/api/__sitemap__/${kind}`], chunks: true },
        ]),
      ),
    },
  },

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
      apiBase,
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
      include: [
        "@internationalized/date",
        "@vueuse/core",
        "zod",
        // MDC lazy-loads its markdown parser on client navigation. Its own include list starts at
        // `@nuxtjs/mdc`, which pnpm does not expose to this app, so these CommonJS deps would ship
        // unbundled and fail with "does not provide an export named 'default'".
        "@nuxt/content > @nuxtjs/mdc > debug",
        "@nuxt/content > @nuxtjs/mdc > unified > extend",
      ],
    },
  },
});
