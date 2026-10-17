import { z } from "zod";

export const ReplyContentDto = z.strictObject({
  content: z
    .string()
    .trim()
    .min(1, "Comment cannot be empty. Write something before posting.")
    .max(2048, "Comment is too long. Keep it under 2048 characters."),
  replyToId: z.uuidv4().optional(),
});
export type ReplyContentDto = z.infer<typeof ReplyContentDto>;

export const CreateReplyDto = ReplyContentDto.extend({
  postId: z.uuidv4().optional(),
  newsArticleId: z.uuidv4().optional(),
  matchId: z.uuidv4().optional(),
}).refine(
  (dto) =>
    [dto.postId, dto.newsArticleId, dto.matchId].filter((id) => id !== undefined).length === 1,
  {
    message: "Provide exactly one of postId, newsArticleId, or matchId.",
    path: ["content"],
  },
);
export type CreateReplyDto = z.infer<typeof CreateReplyDto>;
