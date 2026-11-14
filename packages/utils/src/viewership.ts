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

export const isForbiddenViewershipSource = (hostname: string): boolean => {
  const host = hostname.toLowerCase().replace(/\.$/u, "");

  return isForbiddenSourceHost(host) || host === "start.gg" || host.endsWith(".start.gg");
};

const isViewerCount = (value: number): boolean =>
  Number.isInteger(value) && value >= 0 && value <= MAX_VIEWERS;

export const parseViewership = (input: Viewership): ParsedViewership => {
  if (!isViewerCount(input.peakViewers)) {
    return { error: "invalid-peak", ok: false };
  }

  if (input.averageViewers !== null) {
    if (!isViewerCount(input.averageViewers)) {
      return { error: "invalid-average", ok: false };
    }

    if (input.averageViewers > input.peakViewers) {
      return { error: "average-above-peak", ok: false };
    }
  }

  const sourceName = input.sourceName.trim();

  if (!sourceName) {
    return { error: "missing-source-name", ok: false };
  }

  if (sourceName.length > VIEWERSHIP_SOURCE_NAME_MAX_LENGTH) {
    return { error: "source-name-too-long", ok: false };
  }

  const rawUrl = input.sourceUrl.trim();

  if (rawUrl.length > VIEWERSHIP_SOURCE_URL_MAX_LENGTH || !URL.canParse(rawUrl)) {
    return { error: "invalid-source-url", ok: false };
  }

  const url = new URL(rawUrl);

  if (url.protocol !== "https:") {
    return { error: "source-url-not-https", ok: false };
  }

  if (url.username || url.password) {
    return { error: "invalid-source-url", ok: false };
  }

  if (isForbiddenViewershipSource(url.hostname)) {
    return { error: "forbidden-source", ok: false };
  }

  let measuredAt: string | null = null;

  if (input.measuredAt !== null) {
    const time = Date.parse(input.measuredAt);

    if (Number.isNaN(time)) {
      return { error: "invalid-measured-at", ok: false };
    }

    measuredAt = new Date(time).toISOString();
  }

  return {
    ok: true,
    viewership: {
      averageViewers: input.averageViewers,
      measuredAt,
      peakViewers: input.peakViewers,
      scope: input.scope,
      sourceName,
      sourceUrl: url.href,
    },
  };
};
