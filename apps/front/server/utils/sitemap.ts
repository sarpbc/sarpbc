import type { H3Event } from "h3";
import {
  buildNewsUrlset,
  buildPagesUrlset,
  buildSitemapIndex,
  parseNewsSitemapChunk,
  type NewsSitemapChunkResponse,
  type NewsSitemapMetaResponse,
} from "~/utils/sitemap";
import { getFetchStatusCode } from "./match-og";

const SITEMAP_CACHE_CONTROL = "public, max-age=300";

export function sendXml(event: H3Event, xml: string): string {
  setHeader(event, "Content-Type", "application/xml; charset=utf-8");
  setHeader(event, "Cache-Control", SITEMAP_CACHE_CONTROL);
  return xml;
}

function rethrowSitemapFetchError(cause: unknown): never {
  const statusCode = getFetchStatusCode(cause);
  if (statusCode === 404) {
    throw createError({ statusCode: 404, statusMessage: "News sitemap chunk not found" });
  }
  throw createError({
    statusCode: 502,
    statusMessage: "Could not load news sitemap",
    cause,
  });
}

export async function handleSitemapIndex(event: H3Event): Promise<string> {
  let meta: NewsSitemapMetaResponse;
  try {
    meta = await $fetch<NewsSitemapMetaResponse>(`${useApiBase()}/news/sitemap`, {
      headers: useInternalApiHeaders(),
    });
  } catch (cause) {
    rethrowSitemapFetchError(cause);
  }
  return sendXml(event, buildSitemapIndex(meta.chunkCount));
}

export function handlePagesSitemap(event: H3Event): string {
  return sendXml(event, buildPagesUrlset());
}

export async function handleNewsSitemapChunk(
  event: H3Event,
  rawChunk: string | undefined,
): Promise<string> {
  const chunk = parseNewsSitemapChunk(rawChunk);
  if (chunk === null) {
    throw createError({ statusCode: 404, statusMessage: "News sitemap chunk not found" });
  }

  let response: NewsSitemapChunkResponse;
  try {
    response = await $fetch<NewsSitemapChunkResponse>(`${useApiBase()}/news/sitemap/${chunk}`, {
      headers: useInternalApiHeaders(),
    });
  } catch (cause) {
    rethrowSitemapFetchError(cause);
  }
  return sendXml(event, buildNewsUrlset(response.data));
}
