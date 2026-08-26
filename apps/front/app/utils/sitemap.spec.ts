import { describe, expect, it } from "vitest";
import {
  buildNewsUrlset,
  buildPagesUrlset,
  buildSitemapIndex,
  newsSitemapPath,
  parseNewsSitemapChunk,
} from "./sitemap";

describe("parseNewsSitemapChunk", () => {
  it("accepts non-negative integer path segments", () => {
    expect(parseNewsSitemapChunk("0")).toBe(0);
    expect(parseNewsSitemapChunk("12")).toBe(12);
  });

  it("rejects missing or non-integer segments", () => {
    expect(parseNewsSitemapChunk(undefined)).toBeNull();
    expect(parseNewsSitemapChunk("")).toBeNull();
    expect(parseNewsSitemapChunk("-1")).toBeNull();
    expect(parseNewsSitemapChunk("1.5")).toBeNull();
    expect(parseNewsSitemapChunk("news-sitemap.xml")).toBeNull();
  });
});

describe("buildSitemapIndex", () => {
  it("lists the pages urlset and at least one news chunk", () => {
    const xml = buildSitemapIndex(1);
    expect(xml).toContain("<sitemapindex ");
    expect(xml).toContain("<loc>https://sarpbc.org/sitemaps/pages.xml</loc>");
    expect(xml).toContain(`<loc>https://sarpbc.org${newsSitemapPath(0)}</loc>`);
  });

  it("lists one loc per filled archive chunk", () => {
    const xml = buildSitemapIndex(2);
    expect(xml).toContain(`<loc>https://sarpbc.org${newsSitemapPath(0)}</loc>`);
    expect(xml).toContain(`<loc>https://sarpbc.org${newsSitemapPath(1)}</loc>`);
    expect(xml).not.toContain(newsSitemapPath(2));
  });
});

describe("buildPagesUrlset", () => {
  it("includes about and contact trust pages with fr hreflang", () => {
    const xml = buildPagesUrlset();
    expect(xml).toContain("<loc>https://sarpbc.org/about</loc>");
    expect(xml).toContain("<loc>https://sarpbc.org/contact</loc>");
    expect(xml).toContain('href="https://sarpbc.org/fr/about"');
    expect(xml).toContain('href="https://sarpbc.org/fr/contact"');
  });
});

describe("buildNewsUrlset", () => {
  it("lists a published slug with en/fr/x-default hreflang and omits drafts", () => {
    const xml = buildNewsUrlset([{ slug: "rlcs-finals", lastmod: "2026-08-26T19:06:04.869Z" }]);
    expect(xml).toContain("<loc>https://sarpbc.org/news/rlcs-finals</loc>");
    expect(xml).toContain('hreflang="en" href="https://sarpbc.org/news/rlcs-finals"');
    expect(xml).toContain('hreflang="fr" href="https://sarpbc.org/fr/news/rlcs-finals"');
    expect(xml).toContain('hreflang="x-default" href="https://sarpbc.org/news/rlcs-finals"');
    expect(xml).toContain("<lastmod>2026-08-26</lastmod>");
    expect(xml).not.toContain("secret-draft");
    expect(xml).not.toContain("/admin");
  });

  it("escapes slugs so the urlset stays well-formed", () => {
    const xml = buildNewsUrlset([{ slug: "a&b", lastmod: "2026-01-01" }]);
    expect(xml).toContain("https://sarpbc.org/news/a&amp;b");
    expect(xml).not.toContain("https://sarpbc.org/news/a&b");
  });
});
