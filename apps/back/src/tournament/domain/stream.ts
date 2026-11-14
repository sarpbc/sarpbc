import type { DataSource, Stream, StreamInput } from "@sarpbc/types";
import {
  MAX_STREAMS,
  STREAM_CHANNEL_MAX_LENGTH,
  isIso6391Code,
  parseStreamUrl,
  type StreamUrlError,
} from "@sarpbc/utils";
import { InvalidInputError } from "../../common/domain/errors";
import { nonBlank } from "../../common/domain/text";
import type { OfficialMatchStream } from "./official-match-stream";

export type StreamOwnerKind = "event" | "tournament" | "match";

export interface StreamOwner {
  kind: StreamOwnerKind;
  id: string;
}

export type StreamEditSource = Exclude<DataSource, "pandascore">;

const URL_ERRORS = {
  "invalid-url": "is not a valid URL",
  "not-https": "must use https",
} satisfies Record<StreamUrlError, string>;

function invalid(index: number, reason: string): InvalidInputError {
  return new InvalidInputError(`Stream ${index + 1} ${reason}.`);
}

export function replaceStreams(
  current: readonly Stream[],
  inputs: readonly StreamInput[],
  source: StreamEditSource,
): Stream[] {
  if (inputs.length > MAX_STREAMS)
    throw new InvalidInputError(`A stream list holds at most ${MAX_STREAMS} streams.`);

  const startgg = new Set(
    current.flatMap((stream) => (stream.source === "startgg" ? [stream.url] : [])),
  );

  const seen = new Set<string>();
  const streams: Stream[] = [];
  inputs.forEach((input, index) => {
    const parsed = parseStreamUrl(input.url);

    if (!parsed.ok) throw invalid(index, URL_ERRORS[parsed.error]);
    const language = input.language.trim().toLowerCase();

    if (!isIso6391Code(language))
      throw invalid(index, "needs a two-letter ISO 639-1 language code (e.g. en, fr)");
    const channel = nonBlank(input.channel) ?? parsed.channel;

    if (channel === null || channel === "") throw invalid(index, "needs a channel name");

    if (channel.length > STREAM_CHANNEL_MAX_LENGTH)
      throw invalid(index, `has a channel name over ${STREAM_CHANNEL_MAX_LENGTH} characters`);

    if (seen.has(parsed.url)) return;
    seen.add(parsed.url);
    streams.push({
      url: parsed.url,
      platform: parsed.platform,
      channel,
      language,
      kind: input.kind,
      source: startgg.has(parsed.url) ? "startgg" : source,
    });
  });

  return streams;
}

export function effectiveStreams(...lists: readonly (readonly Stream[])[]): Stream[] {
  return [...(lists.find((list) => list.length > 0) ?? [])];
}

export function pandascoreStreams(official: readonly OfficialMatchStream[]): Stream[] {
  return [...official]
    .sort((a, b) => Number(b.main) - Number(a.main))
    .flatMap((stream) => {
      const parsed = parseStreamUrl(stream.url.trim().replace(/^http:\/\//i, "https://"));
      const [language = ""] = stream.language.trim().toLowerCase().split("-");

      if (!parsed.ok || !isIso6391Code(language)) return [];

      return [
        {
          url: parsed.url,
          platform: parsed.platform,
          channel: parsed.channel ?? new URL(parsed.url).hostname.replace(/^www\./, ""),
          language,
          kind: "official" as const,
          source: "pandascore" as const,
        },
      ];
    });
}
