import {
  DATA_SOURCE_URL_MAX_LENGTH,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  isAcceptedDataSourceUrl,
} from "@sarpbc/utils";
import { z } from "zod";
import { REFUSED_DATA_SOURCE_MESSAGE } from "../../../common/domain/data-source";

export const SEARCH_LIMIT = 20;

export const listLimit = (what: string) =>
  z
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .optional()
    .describe(`Maximum ${what} to return (default ${DEFAULT_PAGE_SIZE}, max ${MAX_PAGE_SIZE}).`);

export const idOrSlugField = (what: string, example?: string) =>
  z
    .string()
    .min(1)
    .describe(
      `${what} slug${example !== undefined && example !== "" ? ` (e.g. ${example})` : ""} or internal UUID.`,
    );

const keepsFields = <Fields extends Record<string, z.ZodType>>(
  described: Record<string, z.ZodType>,
  fields: Fields,
): described is Fields => Object.keys(fields).every((field) => field in described);

/** The input fields of a REST DTO, with MCP descriptions added, so a tool never keeps a second copy of the DTO's rules. */
export const describeFields = <Fields extends Record<string, z.ZodType>>(
  fields: Fields,
  descriptions: { [Field in keyof Fields]?: string },
): Fields => {
  const described = Object.fromEntries(
    Object.entries<z.ZodType>(fields).map(([field, schema]): [string, z.ZodType] => {
      const description = descriptions[field];

      return [
        field,
        description !== undefined && description !== "" ? schema.describe(description) : schema,
      ];
    }),
  );

  if (!keepsFields(described, fields)) {
    throw new Error("describeFields dropped an input field");
  }

  return described;
};

/** PATCH semantics: undefined leaves the date untouched, null clears it. */
export const toPatchedDate = (value: string | null | undefined): Date | null | undefined =>
  value === undefined || value === null ? value : new Date(value);

/** The one source URL rule of every MCP write: http(s), no credentials, never Liquipedia or BLAST.tv. */
export const dataSourceUrlField = (description: string) =>
  z
    .string()
    .max(DATA_SOURCE_URL_MAX_LENGTH)
    .refine(isAcceptedDataSourceUrl, REFUSED_DATA_SOURCE_MESSAGE)
    .describe(description);
