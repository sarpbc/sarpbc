import { Module } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { ReplyController } from "./http/reply.controller";
import { ReplyService } from "../application/reply.service";
import { MikroReplyStore } from "./persistence/reply.store";
import { transactionalReplies } from "./composition";

@Module({
  controllers: [ReplyController],
  exports: [ReplyService],
  providers: [
    {
      inject: [EntityManager],
      provide: ReplyService,
      useFactory: (em: EntityManager) =>
        new ReplyService(new MikroReplyStore(em), transactionalReplies(em)),
    },
  ],
})
export class ReplyModule {}
