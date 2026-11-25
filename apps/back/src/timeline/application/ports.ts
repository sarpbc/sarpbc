import type { StaffTimelineEntry, TimelineEntryInput } from "@sarpbc/types";

export interface TimelineStore {
  list: () => Promise<StaffTimelineEntry[]>;
  find: (id: string) => Promise<StaffTimelineEntry | null>;
  save: (id: string, fields: TimelineEntryInput) => Promise<void>;
  remove: (id: string) => Promise<boolean>;
}
