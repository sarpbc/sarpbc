import { Module } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { SeasonArchiveService } from "../application/season-archive.service";
import { SeasonService } from "../application/season.service";
import { SeasonArchiveController } from "./http/season-archive.controller";
import { SeasonController } from "./http/season.controller";
import { SeasonPersistence } from "./persistence/season.store";

@Module({
  controllers: [SeasonController, SeasonArchiveController],
  providers: [
    {
      provide: SeasonService,
      useFactory: (em: EntityManager) => new SeasonService(new SeasonPersistence(em)),
      inject: [EntityManager],
    },
    {
      provide: SeasonArchiveService,
      useFactory: (em: EntityManager) => new SeasonArchiveService(new SeasonPersistence(em)),
      inject: [EntityManager],
    },
  ],
  exports: [SeasonService],
})
export class SeasonModule {}
