import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { createLogger } from "evlog";
import { R2Service } from "./r2.service";
import { StorageController } from "./http/storage.controller";
import { StorageService } from "../application/storage.service";

@Module({
  controllers: [StorageController],
  exports: [R2Service],
  imports: [ConfigModule],
  providers: [
    {
      inject: [ConfigService],
      provide: R2Service,
      useFactory: (config: ConfigService) => new R2Service(config, createLogger),
    },
    {
      inject: [R2Service],
      provide: StorageService,
      useFactory: (storage: R2Service) => new StorageService(storage),
    },
  ],
})
export class StorageModule {}
