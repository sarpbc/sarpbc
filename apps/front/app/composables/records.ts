import type { RecordBook, RecordVenue } from "@sarpbc/types";

export const getRecordBook = async (venue: RecordVenue | null) =>
  await apiFetch<RecordBook>("/records", { method: "GET", query: { venue: venue ?? undefined } });
