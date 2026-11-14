import { MAX_LINEUP_PLAYERS } from "@sarpbc/utils";
import { z } from "zod";

export const SetMatchLineupsDto = z.strictObject({
  lineups: z
    .array(
      z.strictObject({
        participantId: z.string().min(1).max(255),
        playerIds: z.array(z.uuid()).max(MAX_LINEUP_PLAYERS),
      }),
    )
    .max(16),
});

export type SetMatchLineupsInput = z.infer<typeof SetMatchLineupsDto>;
