import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { MAX_IMAGE_BYTES, MAX_IMAGE_MEGABYTES } from "@sarpbc/utils";
import type { ImageUploadTarget } from "@sarpbc/utils";
import { imageContentType } from "../domain/image-upload";
import type { ObjectStorage, ObjectUploadUrl, StoredObject } from "./ports/object-storage";

export class StorageService {
  constructor(private readonly storage: ObjectStorage) {}

  async createImageUploadUrl(
    contentType: string,
    target: ImageUploadTarget,
  ): Promise<ObjectUploadUrl> {
    return await this.storage.createImageUploadUrl(imageContentType(contentType), target);
  }

  async uploadImage(
    bytes: Uint8Array,
    contentType: string,
    target: ImageUploadTarget,
  ): Promise<StoredObject> {
    const type = imageContentType(contentType);

    if (bytes.byteLength > MAX_IMAGE_BYTES) {
      throw new InvalidInputError(`Image must be no larger than ${MAX_IMAGE_MEGABYTES} MB.`);
    }

    return await this.storage.uploadImage(bytes, type, target);
  }
}
