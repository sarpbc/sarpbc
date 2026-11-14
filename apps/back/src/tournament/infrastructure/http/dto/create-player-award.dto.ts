import { z } from "zod";
import { PLAYER_AWARD_TYPES } from "@sarpbc/types";

export const CreatePlayerAwardDto = z.strictObject({
  awardType: z.enum(PLAYER_AWARD_TYPES),
  participantId: z.uuid(),
  playerId: z.uuid(),
});

export type CreatePlayerAwardInput = z.infer<typeof CreatePlayerAwardDto>;
