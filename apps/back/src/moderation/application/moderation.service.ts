import type { ReplyRecord } from "../../reply/application/models";
import type { ModerationReplies } from "./ports";
import type { ModerationReplyDto } from "./moderation-reply.view";
import { resolveReplyTargetLink } from "../../reply/domain/reply";
import type { ReplyTargetLink } from "../../reply/domain/reply";

const toModerationDto = (
  reply: ReplyRecord,
  reportCount: number,
  target: ReplyTargetLink,
): ModerationReplyDto => ({
  author: {
    id: reply.author.id,
    userName: reply.author.userName,
  },
  content: reply.content,
  createdAt: reply.createdAt,
  hiddenAt: reply.hiddenAt,
  id: reply.id,
  reportCount,
  targetId: target.targetId,
  targetLabel: target.targetLabel,
  targetPath: target.targetPath,
  targetType: target.targetType,
});

export class ModerationService {
  constructor(private readonly replies: ModerationReplies) {}

  async listRecentReplies(limit: number): Promise<ModerationReplyDto[]> {
    const rows = await this.replies.recentForModeration(limit);

    return rows
      .map(({ reply, reportCount }) => {
        const target = resolveReplyTargetLink(reply);

        if (!target) {
          return null;
        }

        return toModerationDto(reply, reportCount, target);
      })
      .filter((item): item is ModerationReplyDto => item !== null);
  }
}
