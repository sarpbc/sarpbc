import { Module } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { TimelineService } from "../application/timeline.service";
import { TimelineEntryController } from "./http/timeline-entry.controller";
import { TimelineController } from "./http/timeline.controller";
import { TimelinePersistence } from "./persistence/timeline.store";

@Module({
  controllers: [TimelineController, TimelineEntryController],
  exports: [TimelineService],
  providers: [
    {
      inject: [EntityManager],
      provide: TimelineService,
      useFactory: (em: EntityManager) => new TimelineService(new TimelinePersistence(em)),
    },
  ],
})
export class TimelineModule {}
