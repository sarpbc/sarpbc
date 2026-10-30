import type { MatchVodSource } from "@sarpbc/types";

const LANGUAGE_CODE_PATTERN = /^[a-z]{2}$/;
const LANGUAGE_NAMES = new Intl.DisplayNames(["en"], { type: "language", fallback: "none" });

export function isIso6391Code(value: string): boolean {
  return LANGUAGE_CODE_PATTERN.test(value) && LANGUAGE_NAMES.of(value) !== undefined;
}

const VOD_HOSTS: ReadonlyMap<string, MatchVodSource> = new Map([
  ["twitch.tv", "twitch"],
  ["www.twitch.tv", "twitch"],
  ["m.twitch.tv", "twitch"],
  ["youtube.com", "youtube"],
  ["www.youtube.com", "youtube"],
  ["m.youtube.com", "youtube"],
  ["youtu.be", "youtube"],
]);

const TIMESTAMP_PATTERN = /^(?:\d+|(?=\d)(?:\d+h)?(?:\d+m)?(?:\d+s)?)$/;

export type MatchVodUrlError =
  | "invalid-url"
  | "not-https"
  | "unsupported-host"
  | "invalid-timestamp";

export type ParsedMatchVodUrl =
  | { ok: true; url: string; source: MatchVodSource }
  | { ok: false; error: MatchVodUrlError };

export function parseMatchVodUrl(input: string): ParsedMatchVodUrl {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return { ok: false, error: "invalid-url" };
  }
  if (url.protocol !== "https:") return { ok: false, error: "not-https" };
  const source = VOD_HOSTS.get(url.hostname);
  if (!source || url.port || url.username || url.password)
    return { ok: false, error: "unsupported-host" };
  if (url.searchParams.getAll("t").some((timestamp) => !TIMESTAMP_PATTERN.test(timestamp)))
    return { ok: false, error: "invalid-timestamp" };
  return { ok: true, url: url.href, source };
}

export const MAX_VODS_PER_GAME = 10;
const MAX_VOD_GAME = 9;

export function maxVodGame(numberOfGames: number | null | undefined): number {
  return numberOfGames && numberOfGames > 0 ? numberOfGames : MAX_VOD_GAME;
}
