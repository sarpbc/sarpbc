import { z } from "zod";

export const MakePickDto = z.strictObject({
  pickedParticipantId: z.string().min(1),
});

export type MakePickDto = z.infer<typeof MakePickDto>;
