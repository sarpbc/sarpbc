import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { ConfigModule } from "@nestjs/config";
import { Image } from "./persistence/image.entity";
import { ImagesController } from "./http/images.controller";
import { ImagesService } from "../application/images.service";
import { CloudflareImagesGateway } from "./cloudflare-images.gateway";
import { ImageRepository } from "./persistence/images.repository";

@Module({
  controllers: [ImagesController],
  exports: [ImagesService],
  imports: [MikroOrmModule.forFeature([Image]), ConfigModule],
  providers: [
    CloudflareImagesGateway,
    ImageRepository,
    {
      inject: [ImageRepository, CloudflareImagesGateway],
      provide: ImagesService,
      useFactory: (images: ImageRepository, host: CloudflareImagesGateway) =>
        new ImagesService(images, host),
    },
  ],
})
export class ImagesModule {}
