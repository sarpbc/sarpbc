import type { NuxtI18nOptions } from "@nuxtjs/i18n";

type PreconnectLink =
  | { rel: "preconnect"; href: string; crossorigin: "anonymous" }
  | { rel: "dns-prefetch"; href: string };

export const DEFAULT_API_BASE = "https://api.sarpbc.org";

export const SITE_ORIGIN = "https://sarpbc.org";

export const apiPreconnectLinks = (apiBase: string): PreconnectLink[] => {
  try {
    const { origin } = new URL(apiBase);

    return [
      { rel: "preconnect", href: origin, crossorigin: "anonymous" },
      { rel: "dns-prefetch", href: origin },
    ];
  } catch {
    return [];
  }
};

export const i18nOptions: NuxtI18nOptions = {
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
};

export const newsMdcComponentMap = (matchesComponent: string) => ({
  player: "SarpPlayerTag",
  team: "SarpTeamTag",
  tweet: "SarpTweetTag",
  matches: matchesComponent,
});
