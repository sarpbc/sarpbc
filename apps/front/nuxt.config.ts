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

const envOr = (value: string | undefined, fallback: string): string =>
  isNonEmptyString(value) ? value : fallback;

const apiBase = envOr(process.env.NUXT_PUBLIC_API_BASE, DEFAULT_API_BASE);
const adminUrl = envOr(process.env.NUXT_PUBLIC_ADMIN_URL, "https://admin.sarpbc.org");

const contentSwr = { swr: 300 } as const;

type RouteRules = NonNullable<NuxtConfig["routeRules"]>;

const localizedRouteRules = (rules: RouteRules): RouteRules =>
  Object.fromEntries(
    Object.entries(rules).flatMap(([path, rule]) => [
      [path, rule],
      [localizedPath(path, "fr"), rule],
    ]),
  );

const isProduction = process.env.NODE_ENV === "production";

const posthogPublicKey = isProduction
  ? envOr(process.env.NUXT_PUBLIC_POSTHOG_PROJECT_TOKEN, "")
  : "";

const posthogHost = envOr(process.env.NUXT_PUBLIC_POSTHOG_HOST, "https://t.sarpbc.org");

const hostnameFromUrl = (base: string | undefined): string | undefined => {
  if (!isNonEmptyString(base)) {
    return undefined;
  }

  try {
    return new URL(base).hostname;
  } catch {
    return undefined;
  }
};

const r2ImageHost = hostnameFromUrl(process.env.NUXT_PUBLIC_R2_PUBLIC_BASE_URL);

export default defineNuxtConfig({
  $production: {
    evlog: {
      console: false,
      sampling: {
        keep: [{ duration: 1000 }, { status: 400 }],
        rates: {
          debug: 0,
          error: 100,
          info: 5,
          warn: 50,
        },
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

  app: {
    head: {
      link: [
        ...apiPreconnectLinks(apiBase),
        { as: "image", href: "/sarpbc.svg", rel: "preload", type: "image/svg+xml" },
      ],
    },
  },

  compatibilityDate: "2026-07-01",

  content: {
    experimental: {
      sqliteConnector: "native",
    },
  },

  css: ["~/assets/css/main.css"],

  devtools: { enabled: false },

  evlog: {
    env: {
      service: "sarpbc-front",
    },
  },

  experimental: {
    viewTransition: true,
    writeEarlyHints: false,
  },

  i18n: i18nOptions,

  icon: {
    clientBundle: {
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
      scan: true,
      sizeLimitKb: 512,
    },
  },

  image: {
    domains: [
      "cdn.pandascore.co",
      "imagedelivery.net",
      ...(isNonEmptyString(r2ImageHost) ? [r2ImageHost] : []),
    ],
  },

  imports: {
    dirs: ["composables/**"],
  },

  mdc: {
    components: { map: newsMdcComponentMap("NewsMatchBlock") },
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

  nitro: {
    compressPublicAssets: {
      brotli: true,
      gzip: true,
    },
    preset: "node-server",
  },

  routeRules: localizedRouteRules({
    "/about": { appLayout: "marketing", ...contentSwr },
    "/brand": { appLayout: "marketing", ...contentSwr },
    "/cookie-policy": contentSwr,
    "/game/career": { appLayout: "game" },
    "/game/career/**": { appLayout: "game" },
    "/legal-notice": contentSwr,
    "/login": { appLayout: "login" },
    "/privacy-policy": contentSwr,
    "/register": { appLayout: "login" },
    "/terms-of-service": contentSwr,
  }),

  runtimeConfig: {
    apiBaseServer: "",
    apiInternalToken: "",
    indexnowKey: "",
    public: {
      adminUrl,
      apiBase,
      posthog: {
        host: posthogHost,
        publicKey: posthogPublicKey,
      },
    },
  },

  site: {
    url: SITE_ORIGIN,
  },

  sitemap: {
    credits: false,
    sitemaps: {
      pages: {
        exclude: ["/login", "/register", "/profile", "/forum/new"],
        includeAppSources: true,
      },
      ...Object.fromEntries(
        SITEMAP_KINDS.map((kind) => [
          kind,
          { chunks: true, sources: [`/api/__sitemap__/${kind}`] },
        ]),
      ),
    },
    xsl: false,
  },

  vite: {
    define: {
      __VUE_PROD_DEVTOOLS__: false,
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
    server: {
      watch: {
        interval: 1000,
        usePolling:
          process.env.CHOKIDAR_USEPOLLING === "true" || process.env.CHOKIDAR_USEPOLLING === "1",
      },
    },
  },
});
