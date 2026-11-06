import { z } from "zod";
import { TRACKED_STREAMER_NAME_MAX_LENGTH, TWITCH_LOGIN_PATTERN } from "@sarpbc/utils";

export const CreateStreamerDto = z.strictObject({
  login: z.string().trim().toLowerCase().regex(TWITCH_LOGIN_PATTERN),
  displayName: z
    .string()
    .trim()
    .max(TRACKED_STREAMER_NAME_MAX_LENGTH)
    .nullish()
    .transform((value) => (value ? value : null)),
});

export type CreateStreamerDto = z.infer<typeof CreateStreamerDto>;
