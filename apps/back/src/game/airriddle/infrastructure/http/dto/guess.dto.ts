import { z } from "zod";

export const GuessDto = z.strictObject({
  guess: z.string().min(1),
  last: z.boolean().optional(),
});

export type GuessInput = z.infer<typeof GuessDto>;
