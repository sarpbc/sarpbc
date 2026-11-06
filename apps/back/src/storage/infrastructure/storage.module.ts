import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { R2Service } from "./r2.service";
import { StorageController } from "./http/storage.controller";
import { StorageService } from "../application/storage.service";

@Module({
  imports: [ConfigModule],
  controllers: [StorageController],
  providers: [
    R2Service,
    {
      provide: StorageService,
      useFactory: (storage: R2Service) => new StorageService(storage),
      inject: [R2Service],
    },
  ],
  exports: [R2Service],
})
export class StorageModule {}
