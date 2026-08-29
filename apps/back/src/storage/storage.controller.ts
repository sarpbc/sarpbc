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

@UseGuards(AuthGuard, PermissionGuard)
@RequirePermissions("images.manage")
@Controller("storage/r2")
export class StorageController {
  constructor(private readonly r2Service: R2Service) {}

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
  uploadCover(
    @Files() files: Record<string, Storage.MultipartFile[]> | null,
    @Req() request: FastifyRequest,
  ) {
    const file = files?.file?.[0];
    if (!file) {
      throw new BadRequestException("Choose a cover image file to upload.");
    }

    return this.r2Service.uploadNewsCover(file.buffer, file.mimetype, file.filename, {
      userId: request.user?.id,
      userEmail: request.user?.email,
      articleSlug: optionalFormField(request.body, "articleSlug"),
      articleTitle: optionalFormField(request.body, "articleTitle"),
      size: file.size,
    });
  }
}
