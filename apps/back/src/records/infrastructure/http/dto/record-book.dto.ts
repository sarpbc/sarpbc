import { z } from "zod";
import { RECORD_VENUES } from "@sarpbc/types";

export const RecordBookQueryDto = z.strictObject({ venue: z.enum(RECORD_VENUES).optional() });

export type RecordBookQueryInput = z.infer<typeof RecordBookQueryDto>;
