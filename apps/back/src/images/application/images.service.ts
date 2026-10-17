import type { ImageMetadata } from "../domain/image";
import type { ImageHost, ImageRepository } from "./ports/image.repository";

export class ImagesService {
  constructor(
    private readonly images: ImageRepository,
    private readonly host: ImageHost,
  ) {}

  saveImage(imageId: string): Promise<ImageMetadata> {
    return this.images.register(imageId, this.host.imageUrl(imageId));
  }
}
