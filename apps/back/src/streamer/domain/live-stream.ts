import type { LiveStreamer } from "@sarpbc/types";

export function byViewerCount(streams: readonly LiveStreamer[]): LiveStreamer[] {
  return [...streams].sort((a, b) => b.viewerCount - a.viewerCount);
}
