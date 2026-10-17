import { z } from "zod";

export const CreateTopicDto = z.strictObject({
  title: z.string().min(1),
  description: z.string().optional(),
});

export type CreateTopicDto = z.infer<typeof CreateTopicDto>;
