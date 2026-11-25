export const TIMELINE_ENTRY_KINDS = ["patch", "format"] as const;

export type TimelineEntryKind = (typeof TIMELINE_ENTRY_KINDS)[number];

export interface TimelineEntryInput {
  date: string;
  kind: TimelineEntryKind;
  nameEn: string;
  nameFr: string;
  noteEn: string;
  noteFr: string;
  sourceUrl: string;
}

export type TimelineEntry = TimelineEntryInput;

export interface StaffTimelineEntry extends TimelineEntry {
  id: string;
}
