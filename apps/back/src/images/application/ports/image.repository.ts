import type { ImageMetadata } from "../../domain/image";

export interface ImageRepository {
  register: (imageId: string, url: string) => Promise<ImageMetadata>;
}

export interface ImageUploadUrl {
  uploadURL: string;
  imageId: string;
}

export interface ImageHost {
  createUploadUrl: () => Promise<ImageUploadUrl>;
  imageUrl: (imageId: string) => string;
}
