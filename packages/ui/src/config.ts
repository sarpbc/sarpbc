import type { NuxtI18nOptions } from "@nuxtjs/i18n";

export const DEFAULT_API_BASE = "https://api.sarpbc.org";

export const SITE_ORIGIN = "https://sarpbc.org";

export const apiPreconnectLinks = (apiBase: string) => {
  try {
    const { origin } = new URL(apiBase);

    return [
      { crossorigin: "anonymous", href: origin, rel: "preconnect" } as const,
      { href: origin, rel: "dns-prefetch" } as const,
    ];
  } catch {
    return [];
  }
};

export const i18nOptions: NuxtI18nOptions = {
  compilation: {
    strictMessage: false,
  },
  defaultLocale: "en",
  detectBrowserLanguage: {
    cookieKey: "i18n_redirected",
    fallbackLocale: "en",
    redirectOn: "root",
    useCookie: true,
  },
  // WARNING: the messages URL carries a hash of every locale file, so a translation change gets a new URL.
  experimental: { httpCacheDuration: 60 * 60 * 24 * 365 },
  langDir: "locales",
  locales: [
    { code: "en", file: "en-US.json", language: "en", name: "English" },
    { code: "fr", file: "fr-FR.json", language: "fr", name: "Français" },
  ],
  strategy: "prefix_except_default",
};

export const newsMdcComponentMap = (matchesComponent: string) => ({
  matches: matchesComponent,
  player: "SarpPlayerTag",
  team: "SarpTeamTag",
  tweet: "SarpTweetTag",
});
