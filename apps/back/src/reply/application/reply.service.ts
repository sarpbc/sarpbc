import { InvalidInputError, NotFoundError, ConflictError } from "../../common/domain/errors";
import { sanitizePlainText } from "../../common/domain/html";
import {
  replyTarget,
  sameReplyTarget,
  replySortOrder,
  type ReplyTargetType,
} from "../domain/reply";
import { REPLY_CREATION_COOLDOWN_MS, REPLY_ERROR_CODES } from "../domain/reply-limits";
import type { ReplyReportReason } from "../domain/reply-report-reason";
import type { ReplyRecord, ReplyView, PaginatedReplies, CreateReplyInput } from "./models";
import type { ReplyQueries, ReplyTransaction, ReplyWriteScope, ReplyReportRecord } from "./ports";
export class ReplyService {
  constructor(
    private readonly replyRepository: ReplyQueries,
    private readonly transaction: ReplyTransaction,
    private readonly now: () => Date = () => new Date(),
    private readonly id: () => string = () => crypto.randomUUID(),
  ) {}

  async findByTargetPaginated(
    targetType: ReplyTargetType,
    targetId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedReplies> {
    const order = replySortOrder(targetType);
    const offset = page * limit;

    const [total, roots] = await Promise.all([
      this.replyRepository.countRootsByTarget(targetType, targetId),
      this.replyRepository.findByTarget(targetType, targetId, {
        order,
        limit,
        offset,
        rootsOnly: true,
      }),
    ]);

    const rootIds = roots.map((reply) => reply.id);
    const descendants = await this.replyRepository.findDescendantsForRoots(
      targetType,
      targetId,
      rootIds,
    );

    return {
      replies: this.toThreadedDtos([...roots, ...descendants]),
      total,
      page,
      limit,
    };
  }

  async recentForModeration(limit: number) {
    return this.replyRepository.findRecentForModeration(limit);
  }

  async countByTargetIds(
    targetType: ReplyTargetType,
    targetIds: string[],
  ): Promise<Map<string, number>> {
    return this.replyRepository.countByTargetIds(targetType, targetIds);
  }

  async create(userId: string, createReplyDto: CreateReplyInput): Promise<ReplyView> {
    return this.transaction.run(async (scope) => {
      const target = replyTarget(createReplyDto);
      const oneMinuteAgo = new Date(this.now().getTime() - REPLY_CREATION_COOLDOWN_MS);
      const latestReply = await scope.replies.findLatestByUser(userId);
      if (latestReply && latestReply.createdAt >= oneMinuteAgo) {
        throw new InvalidInputError({
          message: "You can only create one reply per minute. Wait and try again.",
          code: REPLY_ERROR_CODES.REPLY_RATE_LIMITED,
        });
      }

      const user = await scope.users.findById(userId);
      if (!user) {
        throw new NotFoundError("User not found. Sign in again and try posting.");
      }

      const newReply: ReplyRecord = {
        id: this.id(),
        content: "",
        author: user,
        createdAt: this.now(),
        hiddenAt: null,
        post: null,
        newsArticle: null,
        match: null,
        replyTo: null,
      };
      newReply.content = sanitizePlainText(createReplyDto.content.trim());
      newReply.author = user;
      newReply.hiddenAt = null;

      if (!newReply.content) {
        throw new InvalidInputError("Comment cannot be empty. Write something before posting.");
      }

      const targetFields = await scope.targets.find(target);
      if (!targetFields) {
        const label =
          target.kind === "forumPost"
            ? "Forum post"
            : target.kind === "newsArticle"
              ? "News article"
              : "Match";
        throw new NotFoundError(label + " not found. Refresh the page and try again.");
      }
      Object.assign(newReply, targetFields);
      let replyTo: ReplyRecord | null = null;
      if (createReplyDto.replyToId) {
        replyTo = await scope.replies.findById(createReplyDto.replyToId);
        if (!replyTo || replyTo.hiddenAt) {
          throw new NotFoundError("Parent comment not found. Refresh and try again.");
        }
        this.assertReplyToSameTarget(newReply, replyTo);
      }
      newReply.replyTo = replyTo;

      await scope.replies.save(newReply);

      if (replyTo && replyTo.author.id !== userId) {
        await scope.notifications.createForDirectReply(replyTo.author.id, newReply.id);
      }

      return this.toDto(newReply, []);
    });
  }

  async hide(id: string): Promise<void> {
    return this.transaction.run(async (scope) => {
      const reply = await scope.replies.findById(id);
      if (!reply) {
        throw new NotFoundError("Comment not found. It may already be removed.");
      }
      if (reply.hiddenAt) {
        return;
      }
      reply.hiddenAt = this.now();
      await scope.replies.save(reply);
    });
  }

  async delete(id: string): Promise<void> {
    return this.transaction.run(async (scope) => {
      const reply = await scope.replies.findById(id);
      if (!reply) {
        throw new NotFoundError("Comment not found. It may already be removed.");
      }

      await this.deleteWithChildren(scope, id);
    });
  }

  async report(
    userId: string,
    replyId: string,
    reason: ReplyReportReason,
  ): Promise<{ id: string; reason: ReplyReportReason; createdAt: Date }> {
    return this.transaction.run(async (scope) => {
      const reply = await scope.replies.findById(replyId);
      if (!reply || reply.hiddenAt) {
        throw new NotFoundError("Comment not found. It may already be removed.");
      }

      if (reply.author.id === userId) {
        throw new InvalidInputError("You cannot report your own comment.");
      }

      const existing = await scope.reports.findByReplyAndReporter(replyId, userId);
      if (existing) {
        throw new ConflictError({
          message: "You already reported this comment.",
          code: REPLY_ERROR_CODES.REPLY_ALREADY_REPORTED,
        });
      }

      const reporter = await scope.users.findById(userId);
      if (!reporter) {
        throw new NotFoundError("User not found. Sign in again and try reporting.");
      }

      const report: ReplyReportRecord = {
        id: this.id(),
        reply,
        reporter,
        reason,
        createdAt: this.now(),
      };
      report.reply = reply;
      report.reporter = reporter;
      report.reason = reason;

      await scope.reports.save(report);

      return {
        id: report.id,
        reason: report.reason,
        createdAt: report.createdAt,
      };
    });
  }

  async deleteAllForPost(postId: string): Promise<void> {
    await this.deleteAllForTarget("forumPost", postId);
  }

  async deleteAllForTarget(targetType: ReplyTargetType, targetId: string): Promise<void> {
    return this.transaction.run(async (scope) => {
      const replies = await scope.replies.findByTarget(targetType, targetId, {
        includeHidden: true,
      });
      const rootReplies = replies.filter((reply) => !reply.replyTo);

      for (const reply of rootReplies) {
        await this.deleteWithChildren(scope, reply.id);
      }
    });
  }

  private assertReplyToSameTarget(child: ReplyRecord, parent: ReplyRecord): void {
    if (!sameReplyTarget(child, parent)) {
      throw new InvalidInputError(
        "Parent comment belongs to a different page. Refresh and try again.",
      );
    }
  }

  private async deleteWithChildren(scope: ReplyWriteScope, replyId: string): Promise<void> {
    const children = await scope.replies.findChildren(replyId);
    for (const child of children) {
      await this.deleteWithChildren(scope, child.id);
    }

    const reply = await scope.replies.findById(replyId);
    if (reply) {
      await scope.replies.delete(reply);
    }
  }

  private toThreadedDtos(replies: ReplyRecord[]): ReplyView[] {
    const byId = new Map<string, ReplyView>();
    const roots: ReplyView[] = [];

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

  private toDto(reply: ReplyRecord, nested: ReplyView[]): ReplyView {
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
