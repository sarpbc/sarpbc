import type { Viewership } from "@sarpbc/types";
import { isForbiddenSourceHost } from "./source-host";

export const MAX_VIEWERS = 100_000_000;
export const VIEWERSHIP_SOURCE_NAME_MAX_LENGTH = 80;
export const VIEWERSHIP_SOURCE_URL_MAX_LENGTH = 2048;

export type ViewershipError =
  | "invalid-peak"
  | "invalid-average"
  | "average-above-peak"
  | "missing-source-name"
  | "source-name-too-long"
  | "invalid-source-url"
  | "source-url-not-https"
  | "forbidden-source"
  | "invalid-measured-at";

export type ParsedViewership =
  | { ok: true; viewership: Viewership }
  | { ok: false; error: ViewershipError };

export function isForbiddenViewershipSource(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return isForbiddenSourceHost(host) || host === "start.gg" || host.endsWith(".start.gg");
}

function isViewerCount(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= MAX_VIEWERS;
}

export function parseViewership(input: Viewership): ParsedViewership {
  if (!isViewerCount(input.peakViewers)) return { ok: false, error: "invalid-peak" };
  if (input.averageViewers !== null) {
    if (!isViewerCount(input.averageViewers)) return { ok: false, error: "invalid-average" };
    if (input.averageViewers > input.peakViewers) return { ok: false, error: "average-above-peak" };
  }
  const sourceName = input.sourceName.trim();
  if (!sourceName) return { ok: false, error: "missing-source-name" };
  if (sourceName.length > VIEWERSHIP_SOURCE_NAME_MAX_LENGTH)
    return { ok: false, error: "source-name-too-long" };
  const rawUrl = input.sourceUrl.trim();
  if (rawUrl.length > VIEWERSHIP_SOURCE_URL_MAX_LENGTH || !URL.canParse(rawUrl))
    return { ok: false, error: "invalid-source-url" };
  const url = new URL(rawUrl);
  if (url.protocol !== "https:") return { ok: false, error: "source-url-not-https" };
  if (url.username || url.password) return { ok: false, error: "invalid-source-url" };
  if (isForbiddenViewershipSource(url.hostname)) return { ok: false, error: "forbidden-source" };
  let measuredAt: string | null = null;
  if (input.measuredAt !== null) {
    const time = Date.parse(input.measuredAt);
    if (Number.isNaN(time)) return { ok: false, error: "invalid-measured-at" };
    measuredAt = new Date(time).toISOString();
  }
  return {
    ok: true,
    viewership: {
      peakViewers: input.peakViewers,
      averageViewers: input.averageViewers,
      scope: input.scope,
      measuredAt,
      sourceName,
      sourceUrl: url.href,
    },
  };
}
