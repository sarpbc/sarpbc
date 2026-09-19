import { EntityRepository } from "@mikro-orm/core";
import { Image } from "./domain/image.entity";
import { IImageRepository } from "./domain/image.repository.interface";

export class ImageRepository extends EntityRepository<Image> implements IImageRepository {
  async save(image: Image): Promise<Image> {
    await this.em.persist(image).flush();
    return image;
  }

  async findPage(page: number, limit: number): Promise<[Image[], number]> {
    return this.findAndCount(
      {},
      {
        orderBy: { createdAt: "DESC" },
        offset: page * limit,
        limit,
      },
    );
  }
}
