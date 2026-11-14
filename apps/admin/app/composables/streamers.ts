import type { TrackedStreamer } from "@sarpbc/types";

export const getTrackedStreamers = async (): Promise<TrackedStreamer[]> => {
  const res = await apiFetch<{ streamers: TrackedStreamer[] }>("/streamers", {
    method: "GET",
  });

  return res.streamers ?? [];
};

export const addTrackedStreamer = async (
  login: string,
  displayName: string | null,
): Promise<TrackedStreamer> =>
  await apiFetch<TrackedStreamer>("/streamers", {
    method: "POST",
    body: { login, displayName },
  });

export const removeTrackedStreamer = async (id: string): Promise<void> => {
  await apiFetch(`/streamers/${id}`, { method: "DELETE" });
};
