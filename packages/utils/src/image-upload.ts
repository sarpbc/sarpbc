export const MAX_IMAGE_MEGABYTES = 5;
export const MAX_IMAGE_BYTES = MAX_IMAGE_MEGABYTES * 1024 * 1024;

export const IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export type ImageContentType = (typeof IMAGE_CONTENT_TYPES)[number];

export const IMAGE_FILE_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
} as const satisfies Record<ImageContentType, string>;

/** Browsers send these for JPEG files; the upload endpoints accept them and store `image/jpeg`. */
export const IMAGE_CONTENT_TYPE_ALIASES = ["image/jpg", "image/pjpeg"] as const;

export const IMAGE_UPLOAD_TARGETS = ["news", "tournament"] as const;
export type ImageUploadTarget = (typeof IMAGE_UPLOAD_TARGETS)[number];

export function canonicalImageContentType(contentType: string): string {
  const normalized = contentType.toLowerCase().split(";")[0]?.trim() ?? "";
  return (IMAGE_CONTENT_TYPE_ALIASES as readonly string[]).includes(normalized)
    ? "image/jpeg"
    : normalized;
}
