import type { LiveStreamer } from "~/types/streamer";
import { apiFetch } from "~/utils/apiFetch";

export async function getLiveStreamers(): Promise<LiveStreamer[]> {
  const res = await apiFetch<{ streamers?: LiveStreamer[] }>("/streamers/live", {
    method: "GET",
  });
  return res.streamers ?? [];
}

export function useLiveStreamers() {
  const { data } = useLazyAsyncData("live-streamers", () => getLiveStreamers(), {
    server: false,
    default: () => [] as LiveStreamer[],
  });

  return { streamers: computed(() => data.value ?? []) };
}
