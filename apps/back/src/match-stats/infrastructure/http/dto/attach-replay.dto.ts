import { z } from "zod";

export const attachReplayFields = {
  matchId: z.string().trim().min(1).max(255),
  replay: z.string().trim().min(1).max(500),
  gameNumber: z.number().int(),
  blueParticipantId: z.string().trim().min(1).max(255),
};

export const AttachReplayDto = z.strictObject(attachReplayFields);

export type AttachReplayInput = z.infer<typeof AttachReplayDto>;
