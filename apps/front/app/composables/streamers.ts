import type { LiveStreamer } from "~/types/streamer";

export async function getLiveStreamers(): Promise<LiveStreamer[]> {
  const res = await apiFetch<{ streamers?: LiveStreamer[] }>("/streamers/live", {
    method: "GET",
  });
  return res.streamers ?? [];
}

export function useLiveStreamers() {
  const { data, execute } = useLazyAsyncData("live-streamers", () => getLiveStreamers(), {
    server: false,
    immediate: false,
    default: (): LiveStreamer[] => [],
  });

  return { streamers: data, load: execute };
}
