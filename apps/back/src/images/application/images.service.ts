import type { ImageHost, ImageRepository } from "./ports/image.repository";

export class ImagesService {
  constructor(
    private readonly images: ImageRepository,
    private readonly host: ImageHost,
  ) {}

  async createUploadUrl() {
    return await this.host.createUploadUrl();
  }

  async saveImage(imageId: string) {
    return await this.images.register(imageId, this.host.imageUrl(imageId));
  }
}
