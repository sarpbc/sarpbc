import { EntityRepository } from "@mikro-orm/postgresql";
import { Image } from "./domain/image.entity";
import { IImageRepository } from "./domain/image.repository.interface";

export class ImageRepository extends EntityRepository<Image> implements IImageRepository {
  async save(image: Image): Promise<Image> {
    await this.em.persist(image).flush();
    return image;
  }
}
