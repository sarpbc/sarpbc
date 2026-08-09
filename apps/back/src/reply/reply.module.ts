import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Reply, ReplyReport } from "../forum/forum.entities";
import { NotificationModule } from "../notification/notification.module";
import { ReplyController } from "./reply.controller";
import { ReplyService } from "./reply.service";
import { UserModule } from "src/user/user.module";

@Module({
  imports: [MikroOrmModule.forFeature([Reply, ReplyReport]), UserModule, NotificationModule],
  controllers: [ReplyController],
  providers: [ReplyService],
  exports: [ReplyService],
})
export class ReplyModule {}
