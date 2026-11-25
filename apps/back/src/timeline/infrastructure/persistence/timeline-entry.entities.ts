import { defineEntity, p } from "@mikro-orm/core";
import { TIMELINE_ENTRY_KINDS } from "@sarpbc/types";
import type { TimelineEntryKind } from "@sarpbc/types";
import { v4 } from "uuid";

export class TimelineEntry {
  id: string = v4();
  declare date: string;
  declare kind: TimelineEntryKind;
  declare nameEn: string;
  declare nameFr: string;
  declare noteEn: string;
  declare noteFr: string;
  declare sourceUrl: string;
  createdAt = new Date();
  updatedAt = new Date();
}

export const TimelineEntrySchema = defineEntity({
  class: TimelineEntry,
  indexes: [{ properties: ["date"] }],
  properties: {
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
    date: p.date(),
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    kind: p.enum([...TIMELINE_ENTRY_KINDS]).columnType("text"),
    nameEn: p.text(),
    nameFr: p.text(),
    noteEn: p.text(),
    noteFr: p.text(),
    sourceUrl: p.text(),
    updatedAt: p
      .datetime()
      .type("timestamptz")
      .defaultRaw("now()")
      .onUpdate(() => new Date()),
  },
});
