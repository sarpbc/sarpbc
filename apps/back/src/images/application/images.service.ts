import type { ImageMetadata } from "../domain/image";
import type { ImageHost, ImageRepository, ImageUploadUrl } from "./ports/image.repository";

export class ImagesService {
  constructor(
    private readonly images: ImageRepository,
    private readonly host: ImageHost,
  ) {}

  createUploadUrl(): Promise<ImageUploadUrl> {
    return this.host.createUploadUrl();
  }

  saveImage(imageId: string): Promise<ImageMetadata> {
    return this.images.register(imageId, this.host.imageUrl(imageId));
  }
}
