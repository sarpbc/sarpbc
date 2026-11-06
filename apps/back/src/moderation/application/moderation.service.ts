import type { ReplyRecord } from "../../reply/application/public";
import type { ModerationReplies } from "./ports";
import type { ModerationReplyDto } from "./moderation-reply.view";
import { resolveReplyTargetLink, type ReplyTargetLink } from "../../reply/domain/reply";

export class ModerationService {
  constructor(private readonly replies: ModerationReplies) {}

  async listRecentReplies(limit = 50): Promise<ModerationReplyDto[]> {
    const cappedLimit = Math.min(Math.max(limit, 1), 100);
    const rows = await this.replies.recentForModeration(cappedLimit);

    return rows
      .map(({ reply, reportCount }) => {
        const target = resolveReplyTargetLink(reply);
        if (!target) {
          return null;
        }
        return this.toModerationDto(reply, reportCount, target);
      })
      .filter((item): item is ModerationReplyDto => item !== null);
  }

  private toModerationDto(
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
}
