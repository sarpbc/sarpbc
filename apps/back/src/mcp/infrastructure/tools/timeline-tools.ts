import type { StaffTimelineEntry } from "@sarpbc/types";
import { TIMELINE_ENTRY_KINDS } from "@sarpbc/types";
import {
  TIMELINE_MIN_YEAR,
  TIMELINE_NAME_MAX_LENGTH,
  TIMELINE_NOTE_MAX_LENGTH,
} from "@sarpbc/utils";
import { z } from "zod";
import type { TimelineService } from "../../../timeline/application/timeline.service";
import { defineTool } from "../define-tool";
import { dataSourceUrlField } from "./tool-input";
import { requireUpdateFields } from "./update-fields";

export interface TimelineToolServices {
  timelineService: Pick<TimelineService, "list" | "create" | "update">;
}

const written = (entry: StaffTimelineEntry) => ({
  entityId: entry.id,
  result: entry,
  sourceUrl: entry.sourceUrl,
});

const dateSchema = z.iso
  .date()
  .describe(
    `Calendar date of the patch release or the format change, YYYY-MM-DD, copied from the official source. Not before ${TIMELINE_MIN_YEAR}.`,
  );

const kindSchema = z
  .enum(TIMELINE_ENTRY_KINDS)
  .describe("patch for a Rocket League game patch, format for a competition format change.");

const nameSchema = (language: string) =>
  z
    .string()
    .trim()
    .min(1)
    .max(TIMELINE_NAME_MAX_LENGTH)
    .describe(
      `Short plain-text ${language} name as the official source titles it (for example a patch version or a format name). Never an Epic asset.`,
    );

const noteSchema = (language: string) =>
  z
    .string()
    .trim()
    .min(1)
    .max(TIMELINE_NOTE_MAX_LENGTH)
    .describe(
      `Neutral ${language} note in your own words saying what changed for competitive play. Never paste or closely paraphrase Epic patch notes.`,
    );

const sourceUrlSchema = dataSourceUrlField(
  "Required public page of the official announcement or patch notes. Never Liquipedia, a mirror of it or BLAST.tv.",
);

export const timelineTools = ({ timelineService }: TimelineToolServices) => [
  defineTool({
    description:
      "List the RLCS timeline entries staff entered on sarpbc.org (game patches and competition format changes), by date then creation, each with its id. Run it before create_timeline_entry to avoid a duplicate.",
    handler: async () => await timelineService.list(),
    input: {},
    name: "list_timeline_entries",
    permission: "tournaments.manage",
  }),

  defineTool({
    description:
      "Add an entry to the public RLCS timeline, published at once. Copy the date and the name from the official source, write a neutral note in English and in natural French in your own words, and cite that source. Never paste Epic patch notes or use Epic assets. Staff delete entries in the admin app.",
    handler: async (input) => written(await timelineService.create(input)),
    input: {
      date: dateSchema,
      kind: kindSchema,
      nameEn: nameSchema("English"),
      nameFr: nameSchema("French"),
      noteEn: noteSchema("English"),
      noteFr: noteSchema("French"),
      sourceUrl: sourceUrlSchema,
    },
    name: "create_timeline_entry",
    permission: "tournaments.manage",
    write: true,
  }),

  defineTool({
    description:
      "Update a timeline entry's date, kind, names, notes or source; the change is published at once. Omitted fields stay unchanged. Same sourcing rules as create_timeline_entry: official dates and names, neutral notes in your own words, never Epic patch notes.",
    handler: async ({ id, ...fields }) => {
      requireUpdateFields(fields);

      return written(await timelineService.update(id, fields));
    },
    input: {
      date: dateSchema.optional(),
      id: z.uuid().describe("Timeline entry UUID from list_timeline_entries."),
      kind: kindSchema.optional(),
      nameEn: nameSchema("English").optional(),
      nameFr: nameSchema("French").optional(),
      noteEn: noteSchema("English").optional(),
      noteFr: noteSchema("French").optional(),
      sourceUrl: sourceUrlSchema.optional(),
    },
    name: "update_timeline_entry",
    permission: "tournaments.manage",
    write: true,
  }),
];
