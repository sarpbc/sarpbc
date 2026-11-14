import type { StreamKind, StreamPlatform } from "@sarpbc/types";

export const MAX_STREAMS = 12;
export const STREAM_CHANNEL_MAX_LENGTH = 80;

const STREAM_HOSTS: ReadonlyMap<string, StreamPlatform> = new Map([
  ["twitch.tv", "twitch"],
  ["www.twitch.tv", "twitch"],
  ["m.twitch.tv", "twitch"],
  ["youtube.com", "youtube"],
  ["www.youtube.com", "youtube"],
  ["m.youtube.com", "youtube"],
  ["youtu.be", "youtube"],
  ["kick.com", "kick"],
  ["www.kick.com", "kick"],
]);

export type StreamUrlError = "invalid-url" | "not-https";

export type ParsedStreamUrl =
  | { ok: true; url: string; platform: StreamPlatform; channel: string | null }
  | { ok: false; error: StreamUrlError };

function channelOf(url: URL, platform: StreamPlatform): string | null {
  const first = url.pathname.split("/").find(Boolean) ?? "";

  switch (platform) {
    case "twitch":
    case "kick":
      return first || null;
    case "youtube":
      return first.startsWith("@") ? first : null;
    case "other":
      return url.hostname.replace(/^www\./, "");
    default: {
      const exhaustive: never = platform;

      return exhaustive;
    }
  }
}

export function parseStreamUrl(input: string): ParsedStreamUrl {
  let url: URL;

  try {
    url = new URL(input.trim());
  } catch {
    return { ok: false, error: "invalid-url" };
  }

  if (url.protocol !== "https:") return { ok: false, error: "not-https" };

  if (url.port || url.username || url.password) return { ok: false, error: "invalid-url" };
  const platform = STREAM_HOSTS.get(url.hostname) ?? "other";

  return { ok: true, url: url.href, platform, channel: channelOf(url, platform) };
}

export function orderStreams<T extends { language: string; kind: StreamKind }>(
  streams: readonly T[],
  language: string,
): T[] {
  const rank = (stream: T) =>
    (stream.language === language ? 0 : 2) + (stream.kind === "official" ? 0 : 1);

  return [...streams].sort((a, b) => rank(a) - rank(b));
}
