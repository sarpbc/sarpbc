import { STREAM_KINDS } from "@sarpbc/types";
import { MAX_STREAMS, STREAM_CHANNEL_MAX_LENGTH } from "@sarpbc/utils";
import { z } from "zod";

export const SetStreamsDto = z.strictObject({
  streams: z
    .array(
      z.strictObject({
        url: z.string().min(1).max(2048),
        language: z.string().min(1).max(8),
        kind: z.enum(STREAM_KINDS),
        channel: z.string().max(STREAM_CHANNEL_MAX_LENGTH).optional(),
      }),
    )
    .max(MAX_STREAMS),
});

export type SetStreamsInput = z.infer<typeof SetStreamsDto>;
