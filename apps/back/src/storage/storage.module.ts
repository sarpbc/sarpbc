import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ImagesModule } from "src/images/images.module";
import { UserModule } from "src/user/user.module";
import { R2Service } from "./r2.service";
import { StorageController } from "./storage.controller";

@Module({
  imports: [ConfigModule, UserModule, ImagesModule],
  controllers: [StorageController],
  providers: [R2Service],
  exports: [R2Service],
})
export class StorageModule {}
