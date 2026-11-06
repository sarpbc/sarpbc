import { z } from "zod";

export const DEFAULT_LIST_LIMIT = 20;
export const MAX_LIST_LIMIT = 100;
export const SEARCH_LIMIT = 20;

export function listLimit(what: string) {
  return z
    .number()
    .int()
    .min(1)
    .max(MAX_LIST_LIMIT)
    .optional()
    .describe(`Maximum ${what} to return (default ${DEFAULT_LIST_LIMIT}, max ${MAX_LIST_LIMIT}).`);
}

export function idOrSlugField(what: string, example?: string) {
  return z
    .string()
    .min(1)
    .describe(`${what} slug${example ? ` (e.g. ${example})` : ""} or internal UUID.`);
}

/** The input fields of a REST DTO, with MCP descriptions added, so a tool never keeps a second copy of the DTO's rules. */
export function describeFields<Fields extends Record<string, z.ZodType>>(
  dto: z.ZodObject<Fields, z.core.$ZodObjectConfig>,
  descriptions: { [Field in keyof Fields]?: string },
): Fields {
  return Object.fromEntries(
    Object.entries<z.ZodType>(dto.shape).map(([field, schema]) => {
      const description = descriptions[field];
      return [field, description ? schema.describe(description) : schema];
    }),
  ) as Fields;
}

/** PATCH semantics: undefined leaves the date untouched, null clears it. */
export function toPatchedDate(value: string | null | undefined): Date | null | undefined {
  return value === undefined || value === null ? value : new Date(value);
}
