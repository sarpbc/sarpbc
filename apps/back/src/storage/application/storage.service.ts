import { InvalidInputError } from "../../common/domain/errors";
import type { ImageUploadTarget } from "../domain/image-target";
import { imageContentType, MAX_IMAGE_BYTES } from "../domain/image-upload";
import type {
  ImageUploadContext,
  ObjectStorage,
  R2UploadResponse,
  R2UploadUrlResponse,
} from "./ports/object-storage";

export class StorageService {
  constructor(private readonly storage: ObjectStorage) {}

  createImageUploadUrl(
    contentType: string,
    filename: string | undefined,
    target: ImageUploadTarget,
  ): Promise<R2UploadUrlResponse> {
    return this.storage.createImageUploadUrl(imageContentType(contentType), filename, target);
  }

  async uploadImage(
    bytes: Uint8Array,
    contentType: string,
    filename: string | undefined,
    context: ImageUploadContext,
  ): Promise<R2UploadResponse> {
    const type = imageContentType(contentType);
    if (bytes.byteLength > MAX_IMAGE_BYTES) {
      throw new InvalidInputError("Cover image must be no larger than 5 MB.");
    }
    return this.storage.uploadImage(bytes, type, filename, context);
  }
}
