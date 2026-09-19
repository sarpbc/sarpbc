import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { AuthGuard } from "../auth/auth.guard";
import { Files } from "../common/decorators/files.decorator";
import { MultipartInterceptor } from "../common/interceptors/multipart.interceptor";
import { ImagesService } from "../images/images.service";
import { RequirePermissions } from "../user/decorator/require-permissions.decorator";
import { PermissionGuard } from "../user/user.guard";
import type { Storage } from "../global";
import { R2UploadUrlDto } from "./dto/r2-upload-url.dto";
import { R2Service } from "./r2.service";

const MAX_COVER_BYTES = 5 * 1024 * 1024;

function optionalFormField(body: unknown, field: string): string | undefined {
  if (!body || typeof body !== "object") {
    return undefined;
  }
  const value = (body as Record<string, unknown>)[field];
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function requiredFormField(body: unknown, field: string, message: string): string {
  const value = optionalFormField(body, field);
  if (!value) {
    throw new BadRequestException(message);
  }
  return value;
}

function parseSourceUrl(body: unknown): string {
  const value = requiredFormField(
    body,
    "sourceUrl",
    "Enter a link to the image source (for example, the photographer or publisher page).",
  );

  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new BadRequestException("Source link must start with http:// or https://.");
    }
    return parsed.toString();
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }
    throw new BadRequestException("Enter a valid source link.");
  }
}

@UseGuards(AuthGuard, PermissionGuard)
@RequirePermissions("images.manage")
@Controller("storage/r2")
export class StorageController {
  constructor(
    private readonly r2Service: R2Service,
    private readonly imagesService: ImagesService,
  ) {}

  @Post("upload-url")
  createUploadUrl(@Body() dto: R2UploadUrlDto) {
    return this.r2Service.createNewsCoverUploadUrl(dto.contentType, dto.filename);
  }

  @Post("upload")
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    MultipartInterceptor({
      maxFileSize: MAX_COVER_BYTES,
      fileType: /^image\/(jpeg|png|webp|gif)$/,
    }),
  )
  async uploadCover(
    @Files() files: Record<string, Storage.MultipartFile[]> | null,
    @Req() request: FastifyRequest,
  ) {
    const file = files?.file?.[0];
    if (!file) {
      throw new BadRequestException("Choose a cover image file to upload.");
    }

    const source = requiredFormField(
      request.body,
      "source",
      "Enter who provided this image (for example, Rocket League or a photographer name).",
    );
    const sourceUrl = parseSourceUrl(request.body);

    const { publicUrl, key } = await this.r2Service.uploadNewsCover(
      file.buffer,
      file.mimetype,
      file.filename,
      {
        userId: request.user?.id,
        userEmail: request.user?.email,
        articleSlug: optionalFormField(request.body, "articleSlug"),
        articleTitle: optionalFormField(request.body, "articleTitle"),
        size: file.size,
      },
    );

    const image = await this.imagesService.saveR2Image(
      { key, url: publicUrl, source, sourceUrl },
      request.user?.id,
      request.user?.email,
    );

    return { publicUrl, key, image };
  }
}
