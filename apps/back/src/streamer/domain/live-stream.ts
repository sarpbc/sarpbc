import type { LiveStreamer } from "@sarpbc/types";

export const byViewerCount = (streams: readonly LiveStreamer[]): LiveStreamer[] =>
  streams.toSorted((a, b) => b.viewerCount - a.viewerCount);
