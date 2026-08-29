import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export class R2UploadUrlDto {
  @IsString()
  @IsIn(ALLOWED_CONTENT_TYPES, {
    message: "Cover image must be JPEG, PNG, WebP, or GIF.",
  })
  contentType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  filename?: string;
}
