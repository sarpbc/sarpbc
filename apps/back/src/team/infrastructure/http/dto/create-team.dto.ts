import { z } from "zod";

export const CreateTeamDto = z.strictObject({
  name: z.string().min(1),
  location: z.string().optional(),
  imageUrl: z.string().optional(),
  darkModeImageUrl: z.string().optional(),
  slug: z.string().optional(),
});

export type CreateTeamDto = z.infer<typeof CreateTeamDto>;
