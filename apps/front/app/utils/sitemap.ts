import { SITE_ORIGIN } from "~/utils/calendar/ics";

export const SITEMAP_PAGES_PATH = "/sitemaps/pages.xml";

export interface NewsSitemapEntry {
  slug: string;
  lastmod: string;
}

export interface NewsSitemapMetaResponse {
  total: number;
  chunkSize: number;
  chunkCount: number;
}

export interface NewsSitemapChunkResponse extends NewsSitemapMetaResponse {
  chunk: number;
  data: NewsSitemapEntry[];
}

export type SitemapChangefreq = "daily" | "weekly" | "monthly";

export interface StaticSitemapPage {
  path: string;
  changefreq: SitemapChangefreq;
  priority: string;
}

export const STATIC_SITEMAP_PAGES: readonly StaticSitemapPage[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/game/airriddle", changefreq: "weekly", priority: "0.9" },
  { path: "/game/pickems", changefreq: "weekly", priority: "0.9" },
  { path: "/forum", changefreq: "daily", priority: "0.9" },
  { path: "/tournaments", changefreq: "daily", priority: "0.9" },
  { path: "/matches", changefreq: "daily", priority: "0.9" },
  { path: "/results", changefreq: "daily", priority: "0.9" },
  { path: "/player", changefreq: "daily", priority: "0.9" },
  { path: "/team", changefreq: "daily", priority: "0.9" },
  { path: "/game/career", changefreq: "weekly", priority: "0.7" },
  { path: "/about", changefreq: "monthly", priority: "0.5" },
  { path: "/contact", changefreq: "monthly", priority: "0.5" },
  { path: "/brand", changefreq: "monthly", priority: "0.5" },
  { path: "/cookie-policy", changefreq: "monthly", priority: "0.4" },
  { path: "/legal-notice", changefreq: "monthly", priority: "0.4" },
  { path: "/privacy-policy", changefreq: "monthly", priority: "0.4" },
  { path: "/terms-of-service", changefreq: "monthly", priority: "0.4" },
];

export function newsSitemapPath(chunk: number): string {
  return `/news/${chunk}/news-sitemap.xml`;
}

export function parseNewsSitemapChunk(raw: string | undefined): number | null {
  if (raw === undefined || raw === "") {
    return null;
  }
  if (!/^\d+$/.test(raw)) {
    return null;
  }
  return Number(raw);
}

export function frenchPath(path: string): string {
  if (path === "/") {
    return "/fr/";
  }
  return `/fr${path}`;
}

export function absoluteUrl(path: string, origin: string = SITE_ORIGIN): string {
  if (path === "/") {
    return `${origin}/`;
  }
  return `${origin}${path}`;
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function formatSitemapLastmod(value: string): string {
  return value.slice(0, 10);
}

function hreflangLinks(enUrl: string, frUrl: string): string {
  return [
    `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(enUrl)}" />`,
    `    <xhtml:link rel="alternate" hreflang="fr" href="${escapeXml(frUrl)}" />`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(enUrl)}" />`,
  ].join("\n");
}

function urlsetWrapper(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${body}
</urlset>
`;
}

function pageUrlEntry(page: StaticSitemapPage, origin: string): string {
  const enUrl = absoluteUrl(page.path, origin);
  const frUrl = absoluteUrl(frenchPath(page.path), origin);
  return [enUrl, frUrl]
    .map(
      (url) => `  <url>
    <loc>${escapeXml(url)}</loc>
${hreflangLinks(enUrl, frUrl)}
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
    )
    .join("\n");
}

function newsUrlEntry(entry: NewsSitemapEntry, origin: string): string {
  const path = `/news/${entry.slug}`;
  const enUrl = absoluteUrl(path, origin);
  const frUrl = absoluteUrl(frenchPath(path), origin);
  return [enUrl, frUrl]
    .map(
      (url) => `  <url>
    <loc>${escapeXml(url)}</loc>
${hreflangLinks(enUrl, frUrl)}
    <lastmod>${escapeXml(formatSitemapLastmod(entry.lastmod))}</lastmod>
  </url>`,
    )
    .join("\n");
}

export function buildSitemapIndex(newsChunkCount: number, origin: string = SITE_ORIGIN): string {
  const chunks = Math.max(1, newsChunkCount);
  const sitemaps = [
    `  <sitemap>
    <loc>${escapeXml(absoluteUrl(SITEMAP_PAGES_PATH, origin))}</loc>
  </sitemap>`,
    ...Array.from({ length: chunks }, (_, chunk) => {
      return `  <sitemap>
    <loc>${escapeXml(absoluteUrl(newsSitemapPath(chunk), origin))}</loc>
  </sitemap>`;
    }),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.join("\n")}
</sitemapindex>
`;
}

export function buildPagesUrlset(origin: string = SITE_ORIGIN): string {
  const body = STATIC_SITEMAP_PAGES.map((page) => pageUrlEntry(page, origin)).join("\n");
  return urlsetWrapper(body);
}

export function buildNewsUrlset(
  entries: readonly NewsSitemapEntry[],
  origin: string = SITE_ORIGIN,
): string {
  const body = entries.map((entry) => newsUrlEntry(entry, origin)).join("\n");
  return urlsetWrapper(body);
}
