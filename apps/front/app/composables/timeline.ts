import type { TimelineEntry } from "@sarpbc/types";

export const getTimeline = async () => {
  const res = await apiFetch<{ entries: TimelineEntry[] }>("/timeline", { method: "GET" });

  return res.entries;
};
