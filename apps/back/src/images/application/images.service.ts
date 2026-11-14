import type { ImageMetadata } from "../domain/image";
import type { ImageHost, ImageRepository, ImageUploadUrl } from "./ports/image.repository";

export class ImagesService {
  constructor(
    private readonly images: ImageRepository,
    private readonly host: ImageHost,
  ) {}

  async createUploadUrl(): Promise<ImageUploadUrl> {
    return await this.host.createUploadUrl();
  }

  async saveImage(imageId: string): Promise<ImageMetadata> {
    return await this.images.register(imageId, this.host.imageUrl(imageId));
  }
}
