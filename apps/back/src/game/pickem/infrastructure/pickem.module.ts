import { EntityManager } from "@mikro-orm/postgresql";
import { Logger } from "@nestjs/common";
import { v4 } from "uuid";
import { MikroPickemStore } from "./persistence/pickem.store";
import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { PickemChoice } from "./persistence/pickem.entity";
import { PickemController } from "./http/pickem.controller";
import { PickemService } from "../application/pickem.service";
import { UserModule } from "../../../user/infrastructure/user.module";

@Module({
  imports: [MikroOrmModule.forFeature([PickemChoice]), UserModule],
  controllers: [PickemController],
  providers: [
    {
      provide: PickemService,
      useFactory: (em: EntityManager) => {
        const store = new MikroPickemStore(em);
        const logger = new Logger(PickemService.name);
        return new PickemService(store, store, {
          now: () => new Date(),
          id: v4,
          warn: (message) => logger.warn(message),
        });
      },
      inject: [EntityManager],
    },
  ],
  exports: [PickemService],
})
export class PickemModule {}
