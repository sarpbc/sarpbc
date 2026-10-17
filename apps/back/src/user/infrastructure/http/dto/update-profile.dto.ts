import { z } from "zod";

export const UpdateProfileDto = z.strictObject({
  userName: z
    .string()
    .trim()
    .min(1, "Enter a username.")
    .max(100, "Username must be between 1 and 100 characters."),
});

export type UpdateProfileDto = z.infer<typeof UpdateProfileDto>;
