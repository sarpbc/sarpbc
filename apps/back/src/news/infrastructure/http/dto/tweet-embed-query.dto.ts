import { z } from "zod";

export const TweetEmbedQueryDto = z.strictObject({
  url: z.string().trim().min(1).max(512),
});

export type TweetEmbedQueryInput = z.infer<typeof TweetEmbedQueryDto>;
