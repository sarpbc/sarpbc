import { z } from "zod";

export const UpdateTeamDto = z.strictObject({
  name: z.string().optional(),
  location: z.string().optional(),
  imageUrl: z.string().optional(),
  darkModeImageUrl: z.string().optional(),
  slug: z.string().optional(),
});

export type UpdateTeamInput = z.infer<typeof UpdateTeamDto>;
