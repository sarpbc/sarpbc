import { STATS_ERAS, STATS_GROUPINGS } from "@sarpbc/types";
import { z } from "zod";

export const PlayerStatsQueryDto = z.object({
  by: z.enum(STATS_GROUPINGS).default("player"),
  era: z.enum(STATS_ERAS).optional(),
});

export type PlayerStatsQueryInput = z.infer<typeof PlayerStatsQueryDto>;
