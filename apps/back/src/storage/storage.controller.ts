import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { Files } from "../common/decorators/files.decorator";
import { MultipartInterceptor } from "../common/interceptors/multipart.interceptor";
import { RequirePermissions } from "../user/decorator/require-permissions.decorator";
import { PermissionGuard } from "../user/user.guard";
import type { Storage } from "../global";
import { R2UploadUrlDto } from "./dto/r2-upload-url.dto";
import { R2Service } from "./r2.service";

const MAX_COVER_BYTES = 5 * 1024 * 1024;

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
  uploadCover(@Files() files: Record<string, Storage.MultipartFile[]> | null) {
    const file = files?.file?.[0];
    if (!file) {
      throw new BadRequestException("Choose a cover image file to upload.");
    }

    return this.r2Service.uploadNewsCover(file.buffer, file.mimetype, file.filename);
  }
}
