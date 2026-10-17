import { InvalidInputError } from "../../common/domain/errors";
import { canonicalImageContentType } from "../../common/domain/image-content-type";

export type ImageContentType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function imageContentType(value: string): ImageContentType {
  const canonical = canonicalImageContentType(value);
  switch (canonical) {
    case "image/jpeg":
    case "image/png":
    case "image/webp":
    case "image/gif":
      return canonical;
    default:
      throw new InvalidInputError(
        "Cover image must be JPEG, PNG, WebP, or GIF. Choose a supported file type.",
      );
  }
}
