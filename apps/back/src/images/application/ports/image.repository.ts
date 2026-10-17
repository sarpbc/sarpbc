import type { ImageMetadata } from "../../domain/image";

export interface ImageRepository {
  register(imageId: string, url: string): Promise<ImageMetadata>;
}

export interface ImageHost {
  imageUrl(imageId: string): string;
}
