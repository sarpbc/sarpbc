import { Injectable } from "@nestjs/common";
import { ReplyRepository } from "../reply/reply.repository";
import { ReplyReportRepository } from "../reply/reply-report.repository";
import type { ReplyTargetType } from "../reply/dto/reply-response.dto";
import { Reply } from "../forum/forum.entities";

export type ModerationReplyDto = {
  id: string;
  content: string;
  createdAt: Date;
  hiddenAt: Date | null;
  author: {
    id: string;
    userName: string;
  };
  targetType: ReplyTargetType;
  targetId: string;
  targetLabel: string;
  targetPath: string;
  reportCount: number;
};

@Injectable()
export class ModerationService {
  constructor(
    private readonly replyRepository: ReplyRepository,
    private readonly replyReportRepository: ReplyReportRepository,
  ) {}

  async listRecentReplies(limit = 50): Promise<ModerationReplyDto[]> {
    const cappedLimit = Math.min(Math.max(limit, 1), 100);
    const replies = await this.replyRepository.findRecentForModeration(cappedLimit);
    const reportCounts = await this.replyReportRepository.countByReplyIds(
      replies.map((reply) => reply.id),
    );

    const items = replies.map((reply) =>
      this.toModerationDto(reply, reportCounts.get(reply.id) ?? 0),
    );

    return items.sort((a, b) => {
      if (a.reportCount > 0 && b.reportCount === 0) {
        return -1;
      }
      if (a.reportCount === 0 && b.reportCount > 0) {
        return 1;
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  private toModerationDto(reply: Reply, reportCount: number): ModerationReplyDto {
    const target = this.resolveTarget(reply);

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

  private resolveTarget(reply: Reply): {
    targetType: ReplyTargetType;
    targetId: string;
    targetLabel: string;
    targetPath: string;
  } {
    if (reply.post) {
      return {
        targetType: "forumPost",
        targetId: reply.post.id,
        targetLabel: reply.post.title,
        targetPath: `/forum/post/${reply.post.id}`,
      };
    }

    if (reply.newsArticle) {
      return {
        targetType: "newsArticle",
        targetId: reply.newsArticle.id,
        targetLabel: reply.newsArticle.title,
        targetPath: `/news/${reply.newsArticle.slug}`,
      };
    }

    if (reply.match) {
      return {
        targetType: "match",
        targetId: reply.match.id,
        targetLabel: reply.match.name,
        targetPath: `/matches/${reply.match.id}`,
      };
    }

    return {
      targetType: "forumPost",
      targetId: "",
      targetLabel: "Unknown",
      targetPath: "/",
    };
  }
}
