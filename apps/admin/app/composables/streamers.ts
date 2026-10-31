import type { TrackedStreamer } from "~/types/streamer";

export async function getTrackedStreamers(): Promise<TrackedStreamer[]> {
  const res = await apiFetch<{ streamers: TrackedStreamer[] }>("/streamers", {
    method: "GET",
  });
  return res.streamers ?? [];
}

export async function addTrackedStreamer(
  login: string,
  displayName: string | null,
): Promise<TrackedStreamer> {
  return apiFetch<TrackedStreamer>("/streamers", {
    method: "POST",
    body: { login, displayName },
  });
}

export async function removeTrackedStreamer(id: string): Promise<void> {
  await apiFetch(`/streamers/${id}`, { method: "DELETE" });
}
