import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { ConfigModule } from "@nestjs/config";
import { Image } from "./domain/image.entity";
import { ImagesController } from "./images.controller";
import { ImagesService } from "./images.service";
import { UserModule } from "src/user/user.module";

@Module({
  imports: [MikroOrmModule.forFeature([Image]), ConfigModule, UserModule],
  controllers: [ImagesController],
  providers: [ImagesService],
  exports: [ImagesService],
})
export class ImagesModule {}
