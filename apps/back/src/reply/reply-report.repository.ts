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

    const rows = await this.createQueryBuilder("report")
      .select(["report.reply_id", "count(*) as count"])
      .where({ reply: { $in: replyIds } })
      .groupBy("report.reply_id")
      .execute<{ reply_id: string; count: string }[]>();

    const counts = new Map<string, number>();
    for (const row of rows) {
      counts.set(row.reply_id, Number(row.count));
    }
    return counts;
  }
}
