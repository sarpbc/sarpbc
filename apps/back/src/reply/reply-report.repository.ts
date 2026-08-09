import { EntityRepository, type EntityKey } from "@mikro-orm/core";
import { ReplyReport } from "../forum/forum.entities";

export class ReplyReportRepository extends EntityRepository<ReplyReport> {
  async findByReplyAndReporter(replyId: string, reporterId: string): Promise<ReplyReport | null> {
    return this.findOne({
      reply: { id: replyId },
      reporter: { id: reporterId },
    });
  }

  async save(report: ReplyReport): Promise<void> {
    await this.em.persist(report).flush();
  }

  async countByReplyIds(replyIds: string[]): Promise<Map<string, number>> {
    if (replyIds.length === 0) {
      return new Map();
    }

    const countsDict = await this.countBy("reply" as EntityKey<ReplyReport>, {
      where: { reply: { $in: replyIds } },
    });

    const counts = new Map<string, number>();
    for (const [replyId, count] of Object.entries(countsDict)) {
      counts.set(replyId, count);
    }
    return counts;
  }
}
