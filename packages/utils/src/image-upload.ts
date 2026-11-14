import type { R2UploadResponse } from "@sarpbc/types";
import * as z from "zod/mini";

const r2UploadResponseSchema = z.object({ publicUrl: z.string(), key: z.string() });

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

export const canonicalImageContentType = (contentType: string): string => {
  const normalized = contentType.toLowerCase().split(";")[0]?.trim() ?? "";

  return IMAGE_CONTENT_TYPE_ALIASES.some((alias) => alias === normalized)
    ? "image/jpeg"
    : normalized;
};

export const parseR2UploadResponse = (text: string): R2UploadResponse | undefined => {
  try {
    const parsed = r2UploadResponseSchema.safeParse(JSON.parse(text));

    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
};
