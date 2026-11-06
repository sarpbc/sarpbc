import { localizedPath, newsPath } from "@sarpbc/utils";
import { SITE_ORIGIN } from "@sarpbc/ui/config";

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
  { path: "/transfers", changefreq: "daily", priority: "0.8" },
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

export function absoluteUrl(path: string): string {
  return `${SITE_ORIGIN}${path}`;
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

function pageUrlEntry(page: StaticSitemapPage): string {
  const enUrl = absoluteUrl(page.path);
  const frUrl = absoluteUrl(localizedPath(page.path, "fr"));
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

function newsUrlEntry(entry: NewsSitemapEntry): string {
  const path = newsPath(entry.slug);
  const enUrl = absoluteUrl(path);
  const frUrl = absoluteUrl(localizedPath(path, "fr"));
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

export function buildSitemapIndex(newsChunkCount: number): string {
  const chunks = Math.max(1, newsChunkCount);
  const sitemaps = [
    `  <sitemap>
    <loc>${escapeXml(absoluteUrl(SITEMAP_PAGES_PATH))}</loc>
  </sitemap>`,
    ...Array.from({ length: chunks }, (_, chunk) => {
      return `  <sitemap>
    <loc>${escapeXml(absoluteUrl(newsSitemapPath(chunk)))}</loc>
  </sitemap>`;
    }),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.join("\n")}
</sitemapindex>
`;
}

export function buildPagesUrlset(): string {
  const body = STATIC_SITEMAP_PAGES.map(pageUrlEntry).join("\n");
  return urlsetWrapper(body);
}

export function buildNewsUrlset(entries: readonly NewsSitemapEntry[]): string {
  const body = entries.map(newsUrlEntry).join("\n");
  return urlsetWrapper(body);
}
