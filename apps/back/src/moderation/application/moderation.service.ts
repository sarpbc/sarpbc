import type { ReplyRecord } from "../../reply/application/models";
import type { ModerationReplies } from "./ports";
import type { ModerationReplyDto } from "./moderation-reply.view";
import { resolveReplyTargetLink } from "../../reply/domain/reply";
import type { ReplyTargetLink } from "../../reply/domain/reply";

function toModerationDto(
  reply: ReplyRecord,
  reportCount: number,
  target: ReplyTargetLink,
): ModerationReplyDto {
  return {
    id: reply.id,
    content: reply.content,
    createdAt: reply.createdAt,
    hiddenAt: reply.hiddenAt,
    author: {
      id: reply.author.id,
      userName: reply.author.userName,
    },
    targetType: target.targetType,
    targetId: target.targetId,
    targetLabel: target.targetLabel,
    targetPath: target.targetPath,
    reportCount,
  };
}

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
