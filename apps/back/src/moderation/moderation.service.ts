import { Injectable } from "@nestjs/common";
import { ReplyRepository } from "../reply/reply.repository";
import { resolveReplyTargetLink } from "../reply/reply-target-link.util";
import type { ReplyTargetLink } from "../reply/reply-target-link.util";
import type { ModerationReplyDto } from "./dto/moderation-reply.dto";
import { Reply } from "../forum/forum.entities";

@Injectable()
export class ModerationService {
  constructor(private readonly replyRepository: ReplyRepository) {}

  async listRecentReplies(limit = 50): Promise<ModerationReplyDto[]> {
    const cappedLimit = Math.min(Math.max(limit, 1), 100);
    const rows = await this.replyRepository.findRecentForModeration(cappedLimit);

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
    reply: Reply,
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
