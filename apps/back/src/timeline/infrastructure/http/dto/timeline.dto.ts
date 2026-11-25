import { z } from "zod";
import { TIMELINE_ENTRY_KINDS } from "@sarpbc/types";
import {
  DATA_SOURCE_URL_MAX_LENGTH,
  TIMELINE_NAME_MAX_LENGTH,
  TIMELINE_NOTE_MAX_LENGTH,
} from "@sarpbc/utils";

export const TimelineEntryDto = z.strictObject({
  date: z.iso.date(),
  kind: z.enum(TIMELINE_ENTRY_KINDS),
  nameEn: z.string().trim().min(1).max(TIMELINE_NAME_MAX_LENGTH),
  nameFr: z.string().trim().min(1).max(TIMELINE_NAME_MAX_LENGTH),
  noteEn: z.string().trim().min(1).max(TIMELINE_NOTE_MAX_LENGTH),
  noteFr: z.string().trim().min(1).max(TIMELINE_NOTE_MAX_LENGTH),
  sourceUrl: z.string().trim().min(1).max(DATA_SOURCE_URL_MAX_LENGTH),
});

export type TimelineEntryDtoInput = z.infer<typeof TimelineEntryDto>;
