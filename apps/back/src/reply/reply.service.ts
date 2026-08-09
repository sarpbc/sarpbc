import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { ReplyRepository } from "./reply.repository";
import { ReplyReportRepository } from "./reply-report.repository";
import { Reply, ReplyReport } from "../forum/forum.entities";
import { CreateReplyDto } from "./dto/create-reply.dto";
import { UserService } from "src/user/user.service";
import { Post } from "src/forum/forum.entities";
import { NewsArticle } from "src/news/domain/news-article.entity";
import { Match } from "src/tournament/tournament.entities";
import { FORUM_ERROR_CODES, REPLY_CREATION_COOLDOWN_MS } from "src/forum/forum.constants";
import type { ReplyTargetType } from "./dto/reply-response.dto";
import { ReplyResponseDto } from "./dto/reply-response.dto";
import type { ReplyReportReason } from "./reply-report-reason";
import { NotificationService } from "src/notification/notification.service";

@Injectable()
export class ReplyService {
  constructor(
    private readonly replyRepository: ReplyRepository,
    private readonly replyReportRepository: ReplyReportRepository,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
    private readonly em: EntityManager,
  ) {}

  async findByPostId(postId: string): Promise<Reply[]> {
    return this.replyRepository.findByPostId(postId);
  }

  async findByNewsArticleId(newsArticleId: string): Promise<Reply[]> {
    return this.replyRepository.findByNewsArticleId(newsArticleId);
  }

  async findByMatchId(matchId: string): Promise<Reply[]> {
    return this.replyRepository.findByMatchId(matchId);
  }

  async findByTarget(targetType: ReplyTargetType, targetId: string): Promise<ReplyResponseDto[]> {
    let replies: Reply[];
    switch (targetType) {
      case "forumPost":
        replies = await this.replyRepository.findByPostId(targetId);
        break;
      case "newsArticle":
        replies = await this.replyRepository.findByNewsArticleId(targetId);
        break;
      case "match":
        replies = await this.replyRepository.findByMatchId(targetId);
        break;
      default: {
        const _exhaustive: never = targetType;
        throw new BadRequestException(`Unsupported target type: ${_exhaustive}`);
      }
    }

    return this.toThreadedDtos(replies);
  }

  async create(userId: string, createReplyDto: CreateReplyDto): Promise<ReplyResponseDto> {
    const targetCount = [
      createReplyDto.postId,
      createReplyDto.newsArticleId,
      createReplyDto.matchId,
    ].filter(Boolean).length;

    if (targetCount !== 1) {
      throw new BadRequestException("Provide exactly one of postId, newsArticleId, or matchId.");
    }

    const oneMinuteAgo = new Date(Date.now() - REPLY_CREATION_COOLDOWN_MS);
    const latestReply = await this.replyRepository.findLatestByUser(userId);
    if (latestReply && latestReply.createdAt >= oneMinuteAgo) {
      throw new BadRequestException({
        message: "You can only create one reply per minute. Wait and try again.",
        code: FORUM_ERROR_CODES.REPLY_RATE_LIMITED,
      });
    }

    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found. Sign in again and try posting.");
    }

    const newReply = new Reply();
    newReply.content = createReplyDto.content.trim();
    newReply.author = user;
    newReply.hiddenAt = null;

    if (!newReply.content) {
      throw new BadRequestException("Comment cannot be empty. Write something before posting.");
    }

    if (createReplyDto.postId) {
      const post = await this.em.findOne(Post, { id: createReplyDto.postId });
      if (!post) {
        throw new NotFoundException("Forum post not found. Refresh the page and try again.");
      }
      newReply.post = post;
    }

    if (createReplyDto.newsArticleId) {
      const article = await this.em.findOne(NewsArticle, {
        id: createReplyDto.newsArticleId,
      });
      if (!article) {
        throw new NotFoundException("News article not found. Refresh the page and try again.");
      }
      newReply.newsArticle = article;
    }

    if (createReplyDto.matchId) {
      const match = await this.em.findOne(Match, { id: createReplyDto.matchId });
      if (!match) {
        throw new NotFoundException("Match not found. Refresh the page and try again.");
      }
      newReply.match = match;
    }

    let replyTo: Reply | null = null;
    if (createReplyDto.replyToId) {
      replyTo = await this.replyRepository.findById(createReplyDto.replyToId);
      if (!replyTo || replyTo.hiddenAt) {
        throw new NotFoundException("Parent comment not found. Refresh and try again.");
      }
      this.assertReplyToSameTarget(newReply, replyTo);
    }
    newReply.replyTo = replyTo;

    await this.replyRepository.save(newReply);

    if (replyTo && replyTo.author.id !== userId) {
      await this.notificationService.createForDirectReply(replyTo.author, newReply);
    }

    return this.toDto(newReply, []);
  }

  async hide(id: string): Promise<void> {
    const reply = await this.replyRepository.findById(id);
    if (!reply) {
      throw new NotFoundException("Comment not found. It may already be removed.");
    }
    if (reply.hiddenAt) {
      return;
    }
    reply.hiddenAt = new Date();
    await this.replyRepository.save(reply);
  }

  async delete(id: string): Promise<void> {
    const reply = await this.replyRepository.findById(id);
    if (!reply) {
      throw new NotFoundException("Comment not found. It may already be removed.");
    }

    await this.deleteWithChildren(id);
  }

  async report(
    userId: string,
    replyId: string,
    reason: ReplyReportReason,
  ): Promise<{ id: string; reason: ReplyReportReason; createdAt: Date }> {
    const reply = await this.replyRepository.findById(replyId);
    if (!reply || reply.hiddenAt) {
      throw new NotFoundException("Comment not found. It may already be removed.");
    }

    if (reply.author.id === userId) {
      throw new BadRequestException("You cannot report your own comment.");
    }

    const existing = await this.replyReportRepository.findByReplyAndReporter(replyId, userId);
    if (existing) {
      throw new ConflictException({
        message: "You already reported this comment.",
        code: FORUM_ERROR_CODES.REPLY_ALREADY_REPORTED,
      });
    }

    const reporter = await this.userService.findById(userId);
    if (!reporter) {
      throw new NotFoundException("User not found. Sign in again and try reporting.");
    }

    const report = new ReplyReport();
    report.reply = reply;
    report.reporter = reporter;
    report.reason = reason;

    await this.replyReportRepository.getEntityManager().persist(report).flush();

    return {
      id: report.id,
      reason: report.reason,
      createdAt: report.createdAt,
    };
  }

  async deleteAllForPost(postId: string): Promise<void> {
    const replies = await this.replyRepository.findByPostId(postId, true);
    const rootReplies = replies.filter((reply) => !reply.replyTo);

    for (const reply of rootReplies) {
      await this.deleteWithChildren(reply.id);
    }
  }

  private assertReplyToSameTarget(child: Reply, parent: Reply): void {
    const samePost = child.post?.id && parent.post?.id === child.post.id;
    const sameNews = child.newsArticle?.id && parent.newsArticle?.id === child.newsArticle.id;
    const sameMatch = child.match?.id && parent.match?.id === child.match.id;

    if (!samePost && !sameNews && !sameMatch) {
      throw new BadRequestException(
        "Parent comment belongs to a different page. Refresh and try again.",
      );
    }
  }

  private async deleteWithChildren(replyId: string): Promise<void> {
    const children = await this.replyRepository.findChildren(replyId);
    for (const child of children) {
      await this.deleteWithChildren(child.id);
    }

    const reply = await this.replyRepository.findById(replyId);
    if (reply) {
      await this.replyRepository.delete(reply);
    }
  }

  private toThreadedDtos(replies: Reply[]): ReplyResponseDto[] {
    const byId = new Map<string, ReplyResponseDto>();
    const roots: ReplyResponseDto[] = [];

    for (const reply of replies) {
      byId.set(reply.id, this.toDto(reply, []));
    }

    for (const reply of replies) {
      const dto = byId.get(reply.id)!;
      const parentId = reply.replyTo?.id;
      if (parentId && byId.has(parentId)) {
        byId.get(parentId)!.replies.push(dto);
      } else if (!parentId) {
        roots.push(dto);
      }
    }

    return roots;
  }

  private toDto(reply: Reply, nested: ReplyResponseDto[]): ReplyResponseDto {
    return {
      id: reply.id,
      content: reply.content,
      author: {
        id: reply.author.id,
        userName: reply.author.userName,
      },
      createdAt: reply.createdAt,
      replies: nested,
    };
  }
}
