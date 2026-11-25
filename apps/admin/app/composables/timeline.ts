import type { StaffTimelineEntry, TimelineEntryInput } from "@sarpbc/types";

export const getTimelineEntries = async () => {
  const res = await apiFetch<{ entries: StaffTimelineEntry[] }>("/timeline-entries", {
    method: "GET",
  });

  return res.entries;
};

export const createTimelineEntry = async (input: TimelineEntryInput) => {
  const res = await apiFetch<{ entry: StaffTimelineEntry }>("/timeline-entries", {
    body: input,
    method: "POST",
  });

  return res.entry;
};

export const updateTimelineEntry = async (id: string, input: TimelineEntryInput) => {
  const res = await apiFetch<{ entry: StaffTimelineEntry }>(`/timeline-entries/${id}`, {
    body: input,
    method: "PATCH",
  });

  return res.entry;
};

export const deleteTimelineEntry = async (id: string) => {
  await apiFetch(`/timeline-entries/${id}`, { method: "DELETE" });
};
