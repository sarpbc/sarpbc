import { z } from "zod";

export const AttachReplayDto = z.strictObject({
  matchId: z.string().trim().min(1).max(255),
  replay: z.string().trim().min(1).max(500),
  gameNumber: z.number().int(),
  blueParticipantId: z.string().trim().min(1).max(255),
});

export type AttachReplayDto = z.infer<typeof AttachReplayDto>;
