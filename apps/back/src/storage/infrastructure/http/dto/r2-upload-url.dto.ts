import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { IMAGE_PREFIXES, type ImageUploadTarget } from "../../../domain/image-target";

const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export class R2UploadTargetDto {
  @IsIn(Object.keys(IMAGE_PREFIXES))
  target!: ImageUploadTarget;
}

export class R2UploadDto extends R2UploadTargetDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  articleSlug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  articleTitle?: string;
}

export class R2UploadUrlDto extends R2UploadTargetDto {
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
