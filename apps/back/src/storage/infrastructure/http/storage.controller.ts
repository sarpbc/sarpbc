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
import type { R2UploadResponse } from "@sarpbc/types";
import { IMAGE_CONTENT_TYPES, MAX_IMAGE_BYTES, MAX_IMAGE_MEGABYTES } from "@sarpbc/utils";
import { useLogger } from "evlog/nestjs";
import type { FastifyRequest } from "fastify";
import { AuthGuard } from "../../../auth/infrastructure/http/auth.guard";
import { Files } from "../../../common/infrastructure/http/decorators/files.decorator";
import { MultipartInterceptor } from "../../../common/infrastructure/http/interceptors/multipart.interceptor";
import { RequirePermissions } from "../../../user/infrastructure/http/decorator/require-permissions.decorator";
import { PermissionGuard } from "../../../user/infrastructure/http/user.guard";
import type { Storage } from "../../../common/infrastructure/http/fastify";
import { R2UploadDto, R2UploadUrlDto } from "./dto/r2-upload-url.dto";
import { StorageService } from "../../application/storage.service";

const IMAGE_FILE_TYPE = new RegExp(`^(${IMAGE_CONTENT_TYPES.join("|")})$`);

@UseGuards(AuthGuard, PermissionGuard)
@RequirePermissions("images.manage")
@Controller("storage/r2")
export class StorageController {
  constructor(private readonly r2Service: StorageService) {}

  @Post("upload-url")
  createUploadUrl(@Body({ schema: R2UploadUrlDto }) dto: R2UploadUrlDto) {
    return this.r2Service.createImageUploadUrl(dto.contentType, dto.target);
  }

  @Post("upload")
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    MultipartInterceptor(
      { maxFileSize: MAX_IMAGE_BYTES, fileType: IMAGE_FILE_TYPE },
      {
        tooLarge: `Image must be ${MAX_IMAGE_MEGABYTES} MB or smaller. Compress the JPEG or pick another file.`,
        unreadable: `The image could not be read. Try a JPEG, PNG, WebP, or GIF under ${MAX_IMAGE_MEGABYTES} MB.`,
      },
    ),
  )
  uploadImage(
    @Files() files: Record<string, Storage.MultipartFile[]> | null,
    @Req() request: FastifyRequest,
    @Body({ schema: R2UploadDto }) dto: R2UploadDto,
  ): Promise<R2UploadResponse> {
    const file = files?.file?.[0];
    if (!file) {
      throw new BadRequestException("Choose an image file to upload.");
    }

    useLogger().set({
      upload: {
        target: dto.target,
        userId: request.user?.id,
        userEmail: request.user?.email,
        articleSlug: dto.articleSlug,
        articleTitle: dto.articleTitle,
        imageFilename: file.filename,
        imageSize: file.size,
      },
    });
    return this.r2Service.uploadImage(file.buffer, file.mimetype, dto.target);
  }
}
