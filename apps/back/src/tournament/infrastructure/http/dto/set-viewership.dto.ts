import { VIEWERSHIP_SCOPES } from "@sarpbc/types";
import {
  MAX_VIEWERS,
  VIEWERSHIP_SOURCE_NAME_MAX_LENGTH,
  VIEWERSHIP_SOURCE_URL_MAX_LENGTH,
} from "@sarpbc/utils";
import { z } from "zod";

const viewers = z.int().min(0).max(MAX_VIEWERS);

export const SetViewershipDto = z.strictObject({
  viewership: z
    .strictObject({
      peakViewers: viewers,
      averageViewers: viewers.nullable(),
      scope: z.enum(VIEWERSHIP_SCOPES),
      measuredAt: z.iso.datetime({ offset: true }).nullable(),
      sourceName: z.string().trim().min(1).max(VIEWERSHIP_SOURCE_NAME_MAX_LENGTH),
      sourceUrl: z.string().trim().min(1).max(VIEWERSHIP_SOURCE_URL_MAX_LENGTH),
    })
    .nullable(),
});
export type SetViewershipDto = z.infer<typeof SetViewershipDto>;
