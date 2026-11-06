import type { ImageContentType, ImageUploadTarget } from "@sarpbc/utils";

export interface StoredObject {
  publicUrl: string;
  key: string;
}

export interface ObjectUploadUrl extends StoredObject {
  uploadUrl: string;
}

export interface ObjectStorage {
  createImageUploadUrl(
    contentType: ImageContentType,
    target: ImageUploadTarget,
  ): Promise<ObjectUploadUrl>;
  uploadImage(
    bytes: Uint8Array,
    contentType: ImageContentType,
    target: ImageUploadTarget,
  ): Promise<StoredObject>;
  putObject(key: string, bytes: Uint8Array, contentType: string): Promise<StoredObject>;
  copyObject(sourceKey: string, key: string): Promise<StoredObject>;
  deleteObject(key: string): Promise<void>;
}
