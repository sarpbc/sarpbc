import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { ConfigModule } from "@nestjs/config";
import { Image } from "./persistence/image.entity";
import { ImagesController } from "./http/images.controller";
import { ImagesService } from "../application/images.service";
import { CloudflareImagesGateway } from "./cloudflare-images.gateway";
import { ImageRepository } from "./persistence/images.repository";
import { UserModule } from "../../user/infrastructure/user.module";

@Module({
  imports: [MikroOrmModule.forFeature([Image]), ConfigModule, UserModule],
  controllers: [ImagesController],
  providers: [
    CloudflareImagesGateway,
    ImageRepository,
    {
      provide: ImagesService,
      useFactory: (images: ImageRepository, host: CloudflareImagesGateway) =>
        new ImagesService(images, host),
      inject: [ImageRepository, CloudflareImagesGateway],
    },
  ],
  exports: [ImagesService],
})
export class ImagesModule {}
