import type { ImageUploadTarget } from "@sarpbc/utils";

export const IMAGE_PREFIXES = {
  news: "news/covers",
  tournament: "tournaments/images",
} as const satisfies Record<ImageUploadTarget, string>;
