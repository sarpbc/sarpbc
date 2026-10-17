import type { EntityManager } from "@mikro-orm/postgresql";
import { ReplyReport } from "../../../forum/infrastructure/persistence/forum.entities";

export class ReplyReportRepository {
  private readonly rows;

  constructor(em: EntityManager) {
    this.rows = em.getRepository(ReplyReport);
  }
  async findByReplyAndReporter(replyId: string, reporterId: string): Promise<ReplyReport | null> {
    return this.rows.findOne({
      reply: { id: replyId },
      reporter: { id: reporterId },
    });
  }
}
