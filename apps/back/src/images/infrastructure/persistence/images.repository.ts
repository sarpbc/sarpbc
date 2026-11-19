import { Injectable } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { log } from "evlog";
import { IntegrationError } from "../../../common/domain/errors/integration-error";
import type { ImageRepository as ImageStore } from "../../application/ports/image.repository";
import { Image } from "./image.entity";

@Injectable()
export class ImageRepository implements ImageStore {
  constructor(private readonly em: EntityManager) {}

  async register(imageId: string, url: string) {
    const record = new Image();
    record.imageId = imageId;
    record.url = url;

    try {
      await this.em.persist(record).flush();

      return {
        createdAt: record.createdAt,
        id: record.id,
        imageId: record.imageId,
        url: record.url,
      };
    } catch (error) {
      log.error({
        component: ImageRepository.name,
        error: error instanceof Error ? error : new Error(String(error)),
        imageId,
      });
      throw new IntegrationError(
        "The image uploaded, but saving its record failed. Try uploading again.",
      );
    }
  }
}
