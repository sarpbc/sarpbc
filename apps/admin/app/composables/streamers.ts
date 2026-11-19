import type { TrackedStreamer } from "@sarpbc/types";

export const getTrackedStreamers = async () => {
  const res = await apiFetch<{ streamers: TrackedStreamer[] }>("/streamers", {
    method: "GET",
  });

  return res.streamers ?? [];
};

export const addTrackedStreamer = async (login: string, displayName: string | null) =>
  await apiFetch<TrackedStreamer>("/streamers", {
    body: { displayName, login },
    method: "POST",
  });

export const removeTrackedStreamer = async (id: string) => {
  await apiFetch(`/streamers/${id}`, { method: "DELETE" });
};
