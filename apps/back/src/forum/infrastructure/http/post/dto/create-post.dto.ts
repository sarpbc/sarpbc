import { SUPPORTED_LOCALES } from "@sarpbc/types";
import { z } from "zod";
import { POST_CONTENT_MAX_LENGTH, POST_TITLE_MAX_LENGTH } from "../../../../domain/forum.constants";

export const CreatePostDto = z.strictObject({
  id: z.uuidv4(),
  title: z.string().min(1).max(POST_TITLE_MAX_LENGTH),
  content: z.string().min(1).max(POST_CONTENT_MAX_LENGTH),
  topicId: z.uuid(),
  translations: z
    .array(
      z.strictObject({
        locale: z.enum(SUPPORTED_LOCALES),
        title: z.string().min(1).max(POST_TITLE_MAX_LENGTH),
        content: z.string().min(1).max(POST_CONTENT_MAX_LENGTH),
      }),
    )
    .optional(),
});

export type CreatePostDto = z.infer<typeof CreatePostDto>;
