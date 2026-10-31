import type { ImageUploadTarget } from "../../domain/image-target";
import type { ImageContentType } from "../../domain/image-upload";

export interface R2UploadUrlResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

export interface R2UploadResponse {
  publicUrl: string;
  key: string;
}

export interface ImageUploadContext {
  target: ImageUploadTarget;
  userId?: string;
  userEmail?: string;
  articleSlug?: string;
  articleTitle?: string;
  size?: number;
}

export interface ObjectStorage {
  createImageUploadUrl(
    contentType: ImageContentType,
    filename: string | undefined,
    target: ImageUploadTarget,
  ): Promise<R2UploadUrlResponse>;
  uploadImage(
    bytes: Uint8Array,
    contentType: ImageContentType,
    filename: string | undefined,
    context: ImageUploadContext,
  ): Promise<R2UploadResponse>;
  putObject(key: string, bytes: Uint8Array, contentType: string): Promise<R2UploadResponse>;
  copyObject(sourceKey: string, key: string): Promise<R2UploadResponse>;
  deleteObject(key: string): Promise<void>;
}
