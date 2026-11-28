import { STATS_ERAS } from "@sarpbc/types";
import { z } from "zod";

const PlayerSlug = z.string().trim().min(1).max(120);

export const ComparePlayersQueryDto = z.object({
  a: PlayerSlug,
  b: PlayerSlug,
  era: z.enum(STATS_ERAS).optional(),
});

export type ComparePlayersQueryInput = z.infer<typeof ComparePlayersQueryDto>;
