import type { H3Event } from "h3";
import { apiFetch } from "@sarpbc/composables/apiFetch";
import type {
  NewsSitemapChunkResponse,
  NewsSitemapMetaResponse,
  SitemapChunkResponse,
  SitemapIndexResponse,
} from "@sarpbc/types";
import {
  buildContentUrlset,
  buildNewsUrlset,
  buildPagesUrlset,
  buildSitemapIndex,
  parseSitemapChunk,
  parseSitemapKind,
} from "~/utils/sitemap";

const SITEMAP_CACHE_CONTROL = "public, max-age=300";
const CHUNK_NOT_FOUND = "Sitemap chunk not found";

export function sendXml(event: H3Event, xml: string): string {
  setHeader(event, "Content-Type", "application/xml; charset=utf-8");
  setHeader(event, "Cache-Control", SITEMAP_CACHE_CONTROL);
  return xml;
}

function rethrowSitemapFetchError(cause: unknown): never {
  rethrowApiError(cause, {
    notFound: CHUNK_NOT_FOUND,
    badGateway: "Could not load sitemap",
  });
}

export async function handleSitemapIndex(event: H3Event): Promise<string> {
  try {
    const [news, content] = await Promise.all([
      apiFetch<NewsSitemapMetaResponse>(`/news/sitemap`),
      apiFetch<SitemapIndexResponse>(`/sitemap`),
    ]);
    return sendXml(event, buildSitemapIndex(news.chunkCount, content.chunkCounts));
  } catch (cause) {
    rethrowSitemapFetchError(cause);
  }
}

export function handlePagesSitemap(event: H3Event): string {
  return sendXml(event, buildPagesUrlset());
}

export async function handleNewsSitemapChunk(
  event: H3Event,
  rawChunk: string | undefined,
): Promise<string> {
  const chunk = parseSitemapChunk(rawChunk);
  if (chunk === null) {
    throw createError({ statusCode: 404, statusMessage: CHUNK_NOT_FOUND });
  }

  let response: NewsSitemapChunkResponse;
  try {
    response = await apiFetch<NewsSitemapChunkResponse>(`/news/sitemap/${chunk}`);
  } catch (cause) {
    rethrowSitemapFetchError(cause);
  }
  return sendXml(event, buildNewsUrlset(response.data));
}

export async function handleContentSitemapChunk(
  event: H3Event,
  rawKind: string | undefined,
  rawChunk: string | undefined,
): Promise<string> {
  const kind = parseSitemapKind(rawKind);
  const chunk = parseSitemapChunk(rawChunk);
  if (kind === null || chunk === null) {
    throw createError({ statusCode: 404, statusMessage: CHUNK_NOT_FOUND });
  }

  let response: SitemapChunkResponse;
  try {
    response = await apiFetch<SitemapChunkResponse>(`/sitemap/${kind}/${chunk}`);
  } catch (cause) {
    rethrowSitemapFetchError(cause);
  }
  return sendXml(event, buildContentUrlset(response.data));
}
