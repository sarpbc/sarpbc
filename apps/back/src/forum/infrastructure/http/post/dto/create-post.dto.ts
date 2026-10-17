import { z } from "zod";

export const CreatePostDto = z.strictObject({
  id: z.uuidv4(),
  title: z.string().min(1).max(128),
  content: z.string().min(1).max(2048),
  topicId: z.uuid(),
  translations: z
    .array(
      z.strictObject({
        locale: z.enum(["en-US", "fr-FR"]),
        title: z.string().min(1).max(128),
        content: z.string().min(1).max(2048),
      }),
    )
    .optional(),
});

export type CreatePostDto = z.infer<typeof CreatePostDto>;
