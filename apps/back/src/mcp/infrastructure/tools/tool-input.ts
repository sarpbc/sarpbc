import {
  DATA_SOURCE_URL_MAX_LENGTH,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  isAcceptedDataSourceUrl,
} from "@sarpbc/utils";
import { z } from "zod";
import { REFUSED_DATA_SOURCE_MESSAGE } from "../../../common/domain/data-source";

export const SEARCH_LIMIT = 20;

export function listLimit(what: string) {
  return z
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .optional()
    .describe(`Maximum ${what} to return (default ${DEFAULT_PAGE_SIZE}, max ${MAX_PAGE_SIZE}).`);
}

export function idOrSlugField(what: string, example?: string) {
  return z
    .string()
    .min(1)
    .describe(`${what} slug${example ? ` (e.g. ${example})` : ""} or internal UUID.`);
}

/** The input fields of a REST DTO, with MCP descriptions added, so a tool never keeps a second copy of the DTO's rules. */
export function describeFields<Fields extends Record<string, z.ZodType>>(
  fields: Fields,
  descriptions: { [Field in keyof Fields]?: string },
): Fields {
  return Object.fromEntries(
    Object.entries<z.ZodType>(fields).map(([field, schema]) => {
      const description = descriptions[field];

      return [field, description ? schema.describe(description) : schema];
    }),
  ) as Fields;
}

/** PATCH semantics: undefined leaves the date untouched, null clears it. */
export function toPatchedDate(value: string | null | undefined): Date | null | undefined {
  return value === undefined || value === null ? value : new Date(value);
}

/** The one source URL rule of every MCP write: http(s), no credentials, never Liquipedia or BLAST.tv. */
export function dataSourceUrlField(description: string) {
  return z
    .string()
    .max(DATA_SOURCE_URL_MAX_LENGTH)
    .refine(isAcceptedDataSourceUrl, REFUSED_DATA_SOURCE_MESSAGE)
    .describe(description);
}
