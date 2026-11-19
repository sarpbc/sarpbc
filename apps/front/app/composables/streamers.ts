import type { LiveStreamer } from "@sarpbc/types";

const getLiveStreamers = async () => {
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
      default: () => [],
      immediate: false,
      server: false,
    },
  );

  return { load: execute, streamers: data };
};
