import {
  canonicalImageContentType,
  IMAGE_CONTENT_TYPES,
  type ImageContentType,
} from "@sarpbc/utils";
import { InvalidInputError } from "../../common/domain/errors";

export function imageContentType(value: string): ImageContentType {
  const canonical = canonicalImageContentType(value);
  const supported = IMAGE_CONTENT_TYPES.find((type) => type === canonical);
  if (!supported) {
    throw new InvalidInputError(
      "Image must be JPEG, PNG, WebP, or GIF. Choose a supported file type.",
    );
  }
  return supported;
}
