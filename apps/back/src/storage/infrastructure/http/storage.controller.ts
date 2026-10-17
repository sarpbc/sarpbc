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
import { AuthGuard } from "../../../auth/infrastructure/http/auth.guard";
import { Files } from "../../../common/infrastructure/http/decorators/files.decorator";
import { MultipartInterceptor } from "../../../common/infrastructure/http/interceptors/multipart.interceptor";
import { RequirePermissions } from "../../../user/infrastructure/http/decorator/require-permissions.decorator";
import { PermissionGuard } from "../../../user/infrastructure/http/user.guard";
import type { Storage } from "../../../common/infrastructure/http/fastify";
import { R2UploadDto, R2UploadUrlDto } from "./dto/r2-upload-url.dto";
import { StorageService } from "../../application/storage.service";

const MAX_COVER_BYTES = 5 * 1024 * 1024;

@UseGuards(AuthGuard, PermissionGuard)
@RequirePermissions("images.manage")
@Controller("storage/r2")
export class StorageController {
  constructor(private readonly r2Service: StorageService) {}

  @Post("upload-url")
  createUploadUrl(@Body() dto: R2UploadUrlDto) {
    return this.r2Service.createImageUploadUrl(dto.contentType, dto.filename, dto.target);
  }

  @Post("upload")
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    MultipartInterceptor({
      maxFileSize: MAX_COVER_BYTES,
      fileType: /^image\/(jpeg|png|webp|gif)$/,
    }),
  )
  uploadImage(
    @Files() files: Record<string, Storage.MultipartFile[]> | null,
    @Req() request: FastifyRequest,
    @Body() dto: R2UploadDto,
  ) {
    const file = files?.file?.[0];
    if (!file) {
      throw new BadRequestException("Choose a cover image file to upload.");
    }

    return this.r2Service.uploadImage(file.buffer, file.mimetype, file.filename, {
      target: dto.target,
      userId: request.user?.id,
      userEmail: request.user?.email,
      articleSlug: dto.articleSlug,
      articleTitle: dto.articleTitle,
      size: file.size,
    });
  }
}
