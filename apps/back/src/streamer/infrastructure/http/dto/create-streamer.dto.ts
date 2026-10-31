import { z } from "zod";
import { TWITCH_LOGIN_PATTERN } from "@sarpbc/utils";

export const CreateStreamerDto = z.strictObject({
  login: z.string().trim().toLowerCase().regex(TWITCH_LOGIN_PATTERN),
  displayName: z
    .string()
    .trim()
    .max(100)
    .nullish()
    .transform((value) => (value ? value : null)),
});

export type CreateStreamerDto = z.infer<typeof CreateStreamerDto>;
