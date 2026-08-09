import { EntityRepository } from "@mikro-orm/core";
import { ReplyReport } from "../forum/forum.entities";

export class ReplyReportRepository extends EntityRepository<ReplyReport> {
  async findByReplyAndReporter(replyId: string, reporterId: string): Promise<ReplyReport | null> {
    return this.findOne({
      reply: { id: replyId },
      reporter: { id: reporterId },
    });
  }

  async countByReplyIds(replyIds: string[]): Promise<Map<string, number>> {
    if (replyIds.length === 0) {
      return new Map();
    }

    const reports = await this.find(
      { reply: { $in: replyIds } },
      { populate: ["reply"], fields: ["reply"] },
    );

    const counts = new Map<string, number>();
    for (const report of reports) {
      const replyId = report.reply.id;
      counts.set(replyId, (counts.get(replyId) ?? 0) + 1);
    }
    return counts;
  }
}
