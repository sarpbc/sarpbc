import { z } from "zod";
import { ON_THIS_DAY_LINK_KINDS } from "@sarpbc/types";
import {
  ON_THIS_DAY_MIN_YEAR,
  ON_THIS_DAY_SOURCE_URL_MAX_LENGTH,
  ON_THIS_DAY_TEXT_MAX_LENGTH,
} from "@sarpbc/utils";

export const OnThisDayQueryDto = z.strictObject({ date: z.iso.date().optional() });

export type OnThisDayQueryInput = z.infer<typeof OnThisDayQueryDto>;

export const OnThisDayFactDto = z.strictObject({
  month: z.int().min(1).max(12),
  day: z.int().min(1).max(31),
  year: z.int().min(ON_THIS_DAY_MIN_YEAR).max(9999).nullable(),
  textEn: z.string().trim().min(1).max(ON_THIS_DAY_TEXT_MAX_LENGTH),
  textFr: z.string().trim().min(1).max(ON_THIS_DAY_TEXT_MAX_LENGTH),
  link: z.strictObject({ kind: z.enum(ON_THIS_DAY_LINK_KINDS), id: z.uuid() }).nullable(),
  sourceUrl: z.string().trim().max(ON_THIS_DAY_SOURCE_URL_MAX_LENGTH).nullable(),
});

export type OnThisDayFactInput = z.infer<typeof OnThisDayFactDto>;
