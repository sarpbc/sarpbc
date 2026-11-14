import { z } from "zod";

export const CreateTeamDto = z.strictObject({
  darkModeImageUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  location: z.string().optional(),
  name: z.string().min(1),
  slug: z.string().optional(),
});

export type CreateTeamInput = z.infer<typeof CreateTeamDto>;
