import type { DataSource } from "./competition";

export const STREAM_PLATFORMS = ["twitch", "youtube", "kick", "other"] as const;

export type StreamPlatform = (typeof STREAM_PLATFORMS)[number];

export const STREAM_KINDS = ["official", "costream"] as const;

export type StreamKind = (typeof STREAM_KINDS)[number];

export interface Stream {
  url: string;
  platform: StreamPlatform;
  channel: string;
  language: string;
  kind: StreamKind;
  source: DataSource;
}

export interface StreamInput {
  url: string;
  language: string;
  kind: StreamKind;
  channel?: string;
}

export interface StreamsResponse {
  streams: Stream[];
  inherited: Stream[];
}
