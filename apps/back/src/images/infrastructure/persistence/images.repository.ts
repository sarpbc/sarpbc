import { Injectable } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { log } from "evlog";
import { IntegrationError } from "../../../common/domain/errors";
import type { ImageRepository as ImageStore } from "../../application/ports/image.repository";
import type { ImageMetadata } from "../../domain/image";
import { Image } from "./image.entity";

@Injectable()
export class ImageRepository implements ImageStore {
  constructor(private readonly em: EntityManager) {}

  async register(imageId: string, url: string): Promise<ImageMetadata> {
    const record = new Image();
    record.imageId = imageId;
    record.url = url;
    try {
      await this.em.persist(record).flush();
      return {
        id: record.id,
        imageId: record.imageId,
        url: record.url,
        createdAt: record.createdAt,
      };
    } catch (error) {
      log.error({
        component: ImageRepository.name,
        imageId,
        error: error instanceof Error ? error : new Error(String(error)),
      });
      throw new IntegrationError(
        "The image uploaded, but saving its record failed. Try uploading again.",
      );
    }
  }
}
