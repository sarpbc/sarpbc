import { z } from "zod";

export const MakePickDto = z.strictObject({
  pickedParticipantId: z.string().min(1),
});

export type MakePickInput = z.infer<typeof MakePickDto>;
