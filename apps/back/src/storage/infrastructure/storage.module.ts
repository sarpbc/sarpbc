import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { createLogger } from "evlog";
import { R2Service } from "./r2.service";
import { StorageController } from "./http/storage.controller";
import { StorageService } from "../application/storage.service";

@Module({
  imports: [ConfigModule],
  controllers: [StorageController],
  providers: [
    {
      provide: R2Service,
      useFactory: (config: ConfigService) => new R2Service(config, createLogger),
      inject: [ConfigService],
    },
    {
      provide: StorageService,
      useFactory: (storage: R2Service) => new StorageService(storage),
      inject: [R2Service],
    },
  ],
  exports: [R2Service],
})
export class StorageModule {}
