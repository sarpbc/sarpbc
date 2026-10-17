import { z } from "zod";

export const SaveImageDto = z.strictObject({
  imageId: z.string().min(1),
});

export type SaveImageDto = z.infer<typeof SaveImageDto>;
