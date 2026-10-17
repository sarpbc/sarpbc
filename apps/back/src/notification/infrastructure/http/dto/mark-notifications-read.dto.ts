import { z } from "zod";

export const MarkNotificationsReadDto = z.strictObject({
  ids: z.array(z.uuidv4()).optional(),
});

export type MarkNotificationsReadDto = z.infer<typeof MarkNotificationsReadDto>;
