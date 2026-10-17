import { z } from "zod";
import type { ImageUploadTarget } from "../../../domain/image-target";
export const R2UploadTargetDto = z.strictObject({
  target: z.enum(["news", "tournament"] satisfies ImageUploadTarget[]),
});
export type R2UploadTargetDto = z.infer<typeof R2UploadTargetDto>;
export const R2UploadDto = R2UploadTargetDto.extend({
  articleSlug: z.string().max(255).optional(),
  articleTitle: z.string().max(255).optional(),
});
export type R2UploadDto = z.infer<typeof R2UploadDto>;
export const R2UploadUrlDto = R2UploadTargetDto.extend({
  contentType: z.enum(
    ["image/jpeg", "image/jpg", "image/pjpeg", "image/png", "image/webp", "image/gif"],
    { message: "Cover image must be JPEG, PNG, WebP, or GIF." },
  ),
  filename: z.string().max(255).optional(),
});
export type R2UploadUrlDto = z.infer<typeof R2UploadUrlDto>;
