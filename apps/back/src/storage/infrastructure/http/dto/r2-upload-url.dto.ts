import {
  IMAGE_CONTENT_TYPE_ALIASES,
  IMAGE_CONTENT_TYPES,
  IMAGE_UPLOAD_TARGETS,
} from "@sarpbc/utils";
import { z } from "zod";
export const R2UploadTargetDto = z.strictObject({
  target: z.enum(IMAGE_UPLOAD_TARGETS),
});
export type R2UploadTargetDto = z.infer<typeof R2UploadTargetDto>;
export const R2UploadDto = R2UploadTargetDto.extend({
  articleSlug: z.string().max(255).optional(),
  articleTitle: z.string().max(255).optional(),
});
export type R2UploadDto = z.infer<typeof R2UploadDto>;
export const R2UploadUrlDto = R2UploadTargetDto.extend({
  contentType: z.enum([...IMAGE_CONTENT_TYPES, ...IMAGE_CONTENT_TYPE_ALIASES], {
    message: "Image must be JPEG, PNG, WebP, or GIF.",
  }),
  filename: z.string().max(255).optional(),
});
export type R2UploadUrlDto = z.infer<typeof R2UploadUrlDto>;
