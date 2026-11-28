import { z } from "zod";

export const isoDateSchema = z.union([z.iso.date(), z.iso.datetime({ local: true, offset: true })]);

/** PATCH semantics: undefined leaves the date untouched, null clears it. */
export const toPatchedDate = (value: string | null | undefined) =>
  value === undefined || value === null ? value : new Date(value);
