import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { UserModule } from "../../user/infrastructure/user.module";
import { R2Service } from "./r2.service";
import { StorageController } from "./http/storage.controller";
import { StorageService } from "../application/storage.service";

@Module({
  imports: [ConfigModule, UserModule],
  controllers: [StorageController],
  providers: [
    R2Service,
    {
      provide: StorageService,
      useFactory: (storage: R2Service) => new StorageService(storage),
      inject: [R2Service],
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
