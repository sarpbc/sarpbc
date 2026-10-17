import { z } from "zod";

export const CreateTokenDto = z.strictObject({
  name: z.string().trim().min(1).max(100),
});

export type CreateTokenDto = z.infer<typeof CreateTokenDto>;
