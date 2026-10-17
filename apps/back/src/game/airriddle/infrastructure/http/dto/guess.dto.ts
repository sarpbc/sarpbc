import { z } from "zod";

export const GuessDto = z.strictObject({
  guess: z.string().min(1),
  last: z.boolean().optional(),
});

export type GuessDto = z.infer<typeof GuessDto>;
