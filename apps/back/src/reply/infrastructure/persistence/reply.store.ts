import type { EntityManager } from "@mikro-orm/postgresql";
import { Reply, ReplyReport, Post } from "../../../forum/infrastructure/persistence/forum.entities";
import { NewsArticle } from "../../../news/infrastructure/persistence/news-article.entity";
import { Match } from "../../../tournament/infrastructure/persistence/tournament.entities";
import { User } from "../../../user/infrastructure/persistence/user.entity";
import { ReplyRepository } from "./reply.repository";
import { ReplyReportRepository } from "./reply-report.repository";
import { replySnapshot } from "./reply.mapper";
import type { ReplyRecord, ReplyTargetType } from "../../domain/reply";
import type { ReplyWrites, ReplyFindOptions, ReplyReportRecord } from "../../application/ports";
export class MikroReplyStore implements ReplyWrites {
  private readonly rows: ReplyRepository;
  constructor(private readonly em: EntityManager) {
    this.rows = new ReplyRepository(em);
  }
  async findByTarget(type: ReplyTargetType, id: string, options?: ReplyFindOptions) {
    return (await this.rows.findByTarget(type, id, options)).map(replySnapshot);
  }
  async findById(id: string) {
    const row = await this.rows.findById(id);
    return row ? replySnapshot(row) : null;
  }
  async findLatestByUser(id: string) {
    const row = await this.rows.findLatestByUser(id);
    return row ? replySnapshot(row) : null;
  }
  countRootsByTarget(type: ReplyTargetType, id: string) {
    return this.rows.countRootsByTarget(type, id);
  }
  countByTargetIds(type: ReplyTargetType, ids: string[]) {
    return this.rows.countByTargetIds(type, ids);
  }
  async findDescendantsForRoots(type: ReplyTargetType, id: string, roots: string[]) {
    return (await this.rows.findDescendantsForRoots(type, id, roots)).map(replySnapshot);
  }
  async findChildren(id: string) {
    return (await this.rows.findChildren(id)).map(replySnapshot);
  }
  async findRecentForModeration(limit: number) {
    return (await this.rows.findRecentForModeration(limit)).map(({ reply, reportCount }) => ({
      reply: replySnapshot(reply),
      reportCount,
    }));
  }
  async save(model: ReplyRecord) {
    const row = (await this.em.findOne(Reply, { id: model.id })) ?? new Reply();
    row.id = model.id;
    row.content = model.content;
    row.createdAt = model.createdAt;
    row.hiddenAt = model.hiddenAt;
    row.author = this.em.getReference(User, model.author.id);
    row.replyTo = model.replyTo ? this.em.getReference(Reply, model.replyTo.id) : null;
    row.post = model.post ? this.em.getReference(Post, model.post.id) : null;
    row.newsArticle = model.newsArticle
      ? this.em.getReference(NewsArticle, model.newsArticle.id)
      : null;
    row.match = model.match ? this.em.getReference(Match, model.match.id) : null;
    this.em.persist(row);
  }
  async delete(model: ReplyRecord) {
    const row = await this.em.findOne(Reply, { id: model.id });
    if (row) this.em.remove(row);
  }
}
export function replyReports(em: EntityManager) {
  const rows = new ReplyReportRepository(em);
  return {
    async findByReplyAndReporter(
      replyId: string,
      userId: string,
    ): Promise<ReplyReportRecord | null> {
      const row = await rows.findByReplyAndReporter(replyId, userId);
      return row
        ? {
            id: row.id,
            reply: { id: row.reply.id },
            reporter: { id: row.reporter.id },
            reason: row.reason,
            createdAt: new Date(row.createdAt),
          }
        : null;
    },
    async save(model: ReplyReportRecord) {
      const row = new ReplyReport();
      row.id = model.id;
      row.reply = em.getReference(Reply, model.reply.id);
      row.reporter = em.getReference(User, model.reporter.id);
      row.reason = model.reason;
      row.createdAt = model.createdAt;
      em.persist(row);
    },
  };
}
