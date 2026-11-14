import type { LiveStreamer } from "@sarpbc/types";

export const getLiveStreamers = async (): Promise<LiveStreamer[]> => {
  const res = await apiFetch<{ streamers?: LiveStreamer[] }>("/streamers/live", {
    method: "GET",
  });

  return res.streamers ?? [];
};

export const useLiveStreamers = () => {
  const { data, execute } = useLazyAsyncData(
    "live-streamers",
    async () => await getLiveStreamers(),
    {
      server: false,
      immediate: false,
      default: (): LiveStreamer[] => [],
    },
  );

  return { streamers: data, load: execute };
};
