import type { LiveStreamer } from "@sarpbc/types";

export function byViewerCount(streams: readonly LiveStreamer[]): LiveStreamer[] {
  return streams.toSorted((a, b) => b.viewerCount - a.viewerCount);
}
