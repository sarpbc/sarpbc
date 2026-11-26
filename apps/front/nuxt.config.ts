import tailwindcss from "@tailwindcss/vite";
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

const envOr = (value: string | undefined, fallback: string) =>
  isNonEmptyString(value) ? value : fallback;

const apiBase = envOr(process.env.NUXT_PUBLIC_API_BASE, DEFAULT_API_BASE);
const adminUrl = envOr(process.env.NUXT_PUBLIC_ADMIN_URL, "https://admin.sarpbc.org");

const contentSwr = { swr: 300 } as const;

type RouteRules = NonNullable<NuxtConfig["routeRules"]>;

const localizedRouteRules = (rules: RouteRules) =>
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

const hostnameFromUrl = (base: string | undefined) => {
  if (!isNonEmptyString(base)) {
    return null;
  }

  try {
    return new URL(base).hostname;
  } catch {
    return null;
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

  colorMode: {
    classSuffix: "",
    disableTransition: true,
  },

  compatibilityDate: "2026-07-01",

  content: {
    experimental: {
      sqliteConnector: "native",
    },
  },

  css: ["~/assets/css/main.css"],

  devServer: {
    host: "localhost",
  },

  devtools: { enabled: false },

  evlog: {
    env: {
      service: "sarpbc-front",
    },
  },

  experimental: {
    // WARNING: the server builds its route matcher once at startup, so no code may add routes at runtime.
    staticRoutes: true,
    viewTransition: true,
    writeEarlyHints: false,
  },

  fonts: {
    defaults: {
      weights: [400, 500, 600, 700],
    },
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
    cssLayer: "base",
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
    "@nuxt/icon",
    "@nuxt/fonts",
    "@nuxtjs/color-mode",
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

  routeRules: {
    // WARNING: the prerendered messages URL carries a hash of every locale file, so a translation change gets a new URL.
    "/_i18n/**": { headers: { "cache-control": "public, max-age=31536000, immutable" } },
    ...localizedRouteRules({
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
  },

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
        exclude: ["/login", "/register", "/profile", "/forum/new", "/news"],
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
        // WARNING: MDC's own include list starts at `@nuxtjs/mdc`, which pnpm does not expose to this app, so these CommonJS deps would ship unbundled and fail with "does not provide an export named 'default'".
        "@nuxt/content > @nuxtjs/mdc > debug",
        "@nuxt/content > @nuxtjs/mdc > unified > extend",
      ],
    },
    plugins: [tailwindcss()],
    server: {
      watch: {
        interval: 1000,
        usePolling:
          process.env.CHOKIDAR_USEPOLLING === "true" || process.env.CHOKIDAR_USEPOLLING === "1",
      },
    },
  },
});
