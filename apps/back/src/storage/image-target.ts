export const IMAGE_PREFIXES = {
  news: "news/covers",
  tournament: "tournaments/images",
} as const;

export type ImageUploadTarget = keyof typeof IMAGE_PREFIXES;
