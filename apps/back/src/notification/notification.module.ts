import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Reply } from "../forum/forum.entities";
import { UserModule } from "../user/user.module";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";
import { ReplyNotification } from "./reply-notification.entity";

@Module({
  imports: [MikroOrmModule.forFeature([ReplyNotification, Reply]), UserModule],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
