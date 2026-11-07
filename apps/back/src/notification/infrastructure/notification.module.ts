import { Module } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { NotificationController } from "./http/notification.controller";
import { NotificationService } from "../application/notification.service";
import { MikroNotificationStore } from "./persistence/notification.store";
@Module({
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
