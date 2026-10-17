import { z } from "zod";
import { PLAYER_AWARD_TYPES } from "@sarpbc/types";
export const CreatePlayerAwardDto = z.strictObject({
  participantId: z.uuid(),
  playerId: z.uuid(),
  awardType: z.enum(PLAYER_AWARD_TYPES),
});

export type CreatePlayerAwardDto = z.infer<typeof CreatePlayerAwardDto>;
