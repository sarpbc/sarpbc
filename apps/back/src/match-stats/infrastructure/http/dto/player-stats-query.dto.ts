import { STATS_ERAS } from "@sarpbc/types";
import { z } from "zod";

export const PlayerStatsQueryDto = z.object({ era: z.enum(STATS_ERAS).optional() });

export type PlayerStatsQueryInput = z.infer<typeof PlayerStatsQueryDto>;
