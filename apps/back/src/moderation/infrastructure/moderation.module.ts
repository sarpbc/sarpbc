import { Module } from "@nestjs/common";
import { UserModule } from "../../user/infrastructure/user.module";
import { ReplyModule } from "../../reply/infrastructure/reply.module";
import { ReplyService } from "../../reply/application/reply.service";
import { ModerationController } from "./http/moderation.controller";
import { ModerationService } from "../application/moderation.service";
@Module({
  imports: [UserModule, ReplyModule],
  controllers: [ModerationController],
  providers: [
    {
      provide: ModerationService,
      useFactory: (replies: ReplyService) => new ModerationService(replies),
      inject: [ReplyService],
    },
  ],
})
export class ModerationModule {}
