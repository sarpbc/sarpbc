import { STREAM_KINDS } from "@sarpbc/types";
import { MAX_STREAMS, STREAM_CHANNEL_MAX_LENGTH } from "@sarpbc/utils";
import { z } from "zod";

export const SetStreamsDto = z.strictObject({
  streams: z
    .array(
      z.strictObject({
        channel: z.string().max(STREAM_CHANNEL_MAX_LENGTH).optional(),
        kind: z.enum(STREAM_KINDS),
        language: z.string().min(1).max(8),
        url: z.string().min(1).max(2048),
      }),
    )
    .max(MAX_STREAMS),
});

export type SetStreamsInput = z.infer<typeof SetStreamsDto>;
