import {
  FORUM_ERROR_CODES,
  type PaginatedReplies,
  type Reply,
  type ReplyReportReason,
  type ReplyTargetType,
} from "@sarpbc/types";
import { mapSequentially } from "../../common/application/sequentially";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { sanitizePlainText } from "../../common/domain/html";
import { REPLY_TARGETS, replyTarget, sameReplyTarget } from "../domain/reply";
import { replyAlreadyReported } from "../domain/reply-errors";
import { REPLY_CREATION_COOLDOWN_MS } from "../domain/reply-limits";
import type { ReplyRecord, CreateReplyInput } from "./models";
import type { ReplyQueries, ReplyTransaction, ReplyWriteScope, ReplyReportRecord } from "./ports";

function toReplyDto(reply: ReplyRecord, nested: Reply[]): Reply {
  return {
    id: reply.id,
    content: reply.content,
    author: {
      id: reply.author.id,
      userName: reply.author.userName,
    },
    createdAt: reply.createdAt.toISOString(),
    replies: nested,
  };
}

function toThreadedDtos(replies: ReplyRecord[]): Reply[] {
  const dtos = replies.map((reply) => ({ reply, dto: toReplyDto(reply, []) }));
  const byId = new Map(dtos.map(({ reply, dto }) => [reply.id, dto]));
  const roots: Reply[] = [];

  for (const { reply, dto } of dtos) {
    const parentId = reply.replyTo?.id;

    if (parentId === undefined || parentId === "") roots.push(dto);
    else byId.get(parentId)?.replies.push(dto);
  }

  return roots;
}

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
    const offset = page * limit;

    const [total, roots] = await Promise.all([
      this.replyRepository.countRootsByTarget(targetType, targetId),
      this.replyRepository.findByTarget(targetType, targetId, {
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
      replies: toThreadedDtos([...roots, ...descendants]),
      total,
      page,
      limit,
    };
  }

  async recentForModeration(limit: number) {
    return await this.replyRepository.findRecentForModeration(limit);
  }

  async countByTargetIds(
    targetType: ReplyTargetType,
    targetIds: string[],
  ): Promise<Map<string, number>> {
    return await this.replyRepository.countByTargetIds(targetType, targetIds);
  }

  async create(userId: string, createReplyDto: CreateReplyInput): Promise<Reply> {
    return await this.transaction.run(async (scope) => {
      const target = replyTarget(createReplyDto);
      const cooldownStart = new Date(this.now().getTime() - REPLY_CREATION_COOLDOWN_MS);
      const latestReply = await scope.replies.findLatestByUser(userId);

      if (latestReply && latestReply.createdAt >= cooldownStart) {
        throw new InvalidInputError({
          message: "You can only create one reply per minute. Wait and try again.",
          code: FORUM_ERROR_CODES.REPLY_RATE_LIMITED,
        });
      }

      const user = await scope.users.findById(userId);

      if (!user) {
        throw new NotFoundError("User not found. Sign in again and try posting.");
      }

      const content = sanitizePlainText(createReplyDto.content.trim());

      if (!content) {
        throw new InvalidInputError("Comment cannot be empty. Write something before posting.");
      }

      const targetFields = await scope.targets.find(target);

      if (!targetFields) {
        throw new NotFoundError(
          `${REPLY_TARGETS[target.kind].label} not found. Refresh the page and try again.`,
        );
      }

      let replyTo: ReplyRecord | null = null;

      if (createReplyDto.replyToId !== undefined && createReplyDto.replyToId !== "") {
        replyTo = await scope.replies.findById(createReplyDto.replyToId);

        if (!replyTo || replyTo.hiddenAt) {
          throw new NotFoundError("Parent comment not found. Refresh and try again.");
        }

        if (!sameReplyTarget(targetFields, replyTo)) {
          throw new InvalidInputError(
            "Parent comment belongs to a different page. Refresh and try again.",
          );
        }
      }

      const newReply: ReplyRecord = {
        id: this.id(),
        content,
        author: user,
        createdAt: this.now(),
        hiddenAt: null,
        ...targetFields,
        replyTo,
      };

      await scope.replies.save(newReply);

      if (replyTo && replyTo.author.id !== userId) {
        await scope.notifications.createForDirectReply(replyTo.author.id, newReply.id);
      }

      return toReplyDto(newReply, []);
    });
  }

  async hide(id: string): Promise<void> {
    await this.transaction.run(async (scope) => {
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
    await this.transaction.run(async (scope) => {
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
    return await this.transaction.run(async (scope) => {
      const reply = await scope.replies.findById(replyId);

      if (!reply || reply.hiddenAt) {
        throw new NotFoundError("Comment not found. It may already be removed.");
      }

      if (reply.author.id === userId) {
        throw new InvalidInputError("You cannot report your own comment.");
      }

      const existing = await scope.reports.findByReplyAndReporter(replyId, userId);

      if (existing) {
        throw replyAlreadyReported();
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

      await scope.reports.save(report);

      return {
        id: report.id,
        reason: report.reason,
        createdAt: report.createdAt,
      };
    });
  }

  async deleteAllForTarget(targetType: ReplyTargetType, targetId: string): Promise<void> {
    await this.transaction.run(async (scope) => {
      const replies = await scope.replies.findByTarget(targetType, targetId, {
        includeHidden: true,
      });

      const rootReplies = replies.filter((reply) => !reply.replyTo);

      await mapSequentially(rootReplies, async (reply) => {
        await this.deleteWithChildren(scope, reply.id);
      });
    });
  }

  private async deleteWithChildren(scope: ReplyWriteScope, replyId: string): Promise<void> {
    const children = await scope.replies.findChildren(replyId);

    await mapSequentially(children, async (child) => {
      await this.deleteWithChildren(scope, child.id);
    });

    const reply = await scope.replies.findById(replyId);

    if (reply) {
      await scope.replies.delete(reply);
    }
  }
}
