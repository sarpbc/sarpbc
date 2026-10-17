import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSarpbcSeo } from "./seo";

describe("localized page SEO", () => {
  const route = { path: "/fr/about" };
  const useHead = vi.fn();
  const useSeoMeta = vi.fn();

  beforeEach(() => {
    route.path = "/fr/about";
    vi.stubGlobal("useRoute", () => route);
    vi.stubGlobal("useI18n", () => ({
      locales: {
        value: [
          { code: "en", language: "en" },
          { code: "fr", language: "fr" },
        ],
      },
    }));
    vi.stubGlobal("useHead", useHead);
    vi.stubGlobal("useSeoMeta", useSeoMeta);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  function pageLinks() {
    return useHead.mock.lastCall?.[0]().link;
  }

  it("keeps the French canonical while linking both translations and the English fallback", () => {
    const seo = useSarpbcSeo();
    seo.setPageSeo();
    expect(seo.getCanonicalUrl()).toBe("https://sarpbc.org/fr/about");
    expect(pageLinks()).toEqual(
      expect.arrayContaining([
        { rel: "canonical", href: "https://sarpbc.org/fr/about" },
        { rel: "alternate", hreflang: "en", href: "https://sarpbc.org/about" },
        { rel: "alternate", hreflang: "fr", href: "https://sarpbc.org/fr/about" },
        { rel: "alternate", hreflang: "x-default", href: "https://sarpbc.org/about" },
      ]),
    );
  });

  it("keeps root locale URLs consistent after navigation", () => {
    const seo = useSarpbcSeo();
    seo.setPageSeo();
    route.path = "/fr/";
    expect(pageLinks()).toContainEqual({ rel: "canonical", href: "https://sarpbc.org/fr/" });
    expect(pageLinks()).toContainEqual({
      rel: "alternate",
      hreflang: "en",
      href: "https://sarpbc.org/",
    });
  });

  it("does not remove fr from an unrelated path segment", () => {
    route.path = "/freestyle";
    const seo = useSarpbcSeo();
    seo.setPageSeo();
    expect(seo.getCanonicalUrl()).toBe("https://sarpbc.org/freestyle");
    expect(pageLinks()).toContainEqual({
      rel: "alternate",
      hreflang: "en",
      href: "https://sarpbc.org/freestyle",
    });
  });

  it("uses the same canonical for both French homepage spellings", () => {
    route.path = "/fr";
    const seo = useSarpbcSeo();
    seo.setPageSeo();
    expect(seo.getCanonicalUrl()).toBe("https://sarpbc.org/fr/");
    expect(pageLinks()).toContainEqual({ rel: "canonical", href: "https://sarpbc.org/fr/" });
  });
});
