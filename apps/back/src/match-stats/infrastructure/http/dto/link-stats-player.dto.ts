import { z } from "zod";

export const linkStatsPlayerFields = {
  platform: z.string().trim().min(1).max(50),
  platformId: z.string().trim().min(1).max(200),
  playerId: z.uuid(),
};

export const LinkStatsPlayerDto = z.strictObject(linkStatsPlayerFields);

export type LinkStatsPlayerDto = z.infer<typeof LinkStatsPlayerDto>;
