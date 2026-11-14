import { z } from "zod";

export const UpdateTeamDto = z.strictObject({
  darkModeImageUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  location: z.string().optional(),
  name: z.string().optional(),
  slug: z.string().optional(),
});

export type UpdateTeamInput = z.infer<typeof UpdateTeamDto>;
