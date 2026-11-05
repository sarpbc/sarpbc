import { Module } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { UserModule } from "../../user/infrastructure/user.module";
import { NotificationController } from "./http/notification.controller";
import { NotificationService } from "../application/notification.service";
import { MikroNotificationStore } from "./persistence/notification.store";
@Module({
  imports: [UserModule],
  controllers: [NotificationController],
  providers: [
    {
      provide: NotificationService,
      useFactory: (em: EntityManager) => new NotificationService(new MikroNotificationStore(em)),
      inject: [EntityManager],
    },
  ],
})
export class NotificationModule {}
