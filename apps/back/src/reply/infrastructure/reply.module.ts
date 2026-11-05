import { Module } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { UserModule } from "../../user/infrastructure/user.module";
import { ReplyController } from "./http/reply.controller";
import { ReplyService } from "../application/reply.service";
import { MikroReplyStore } from "./persistence/reply.store";
import { transactionalReplies } from "./composition";
@Module({
  imports: [UserModule],
  controllers: [ReplyController],
  providers: [
    {
      provide: ReplyService,
      useFactory: (em: EntityManager) =>
        new ReplyService(new MikroReplyStore(em), transactionalReplies(em)),
      inject: [EntityManager],
    },
  ],
  exports: [ReplyService],
})
export class ReplyModule {}
