import { Image } from "./image.entity";

export interface IImageRepository {
  save(image: Image): Promise<Image>;
  findPage(page: number, limit: number): Promise<[Image[], number]>;
}
