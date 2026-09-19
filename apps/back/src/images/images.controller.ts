import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { AuthGuard } from "../auth/auth.guard";
import { RequirePermissions } from "../user/decorator/require-permissions.decorator";
import { PermissionGuard } from "../user/user.guard";
import { ImagesService } from "./images.service";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { SaveImageDto } from "./dto/save-image.dto";

@UseGuards(AuthGuard, PermissionGuard)
@RequirePermissions("images.manage")
@Controller("images")
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Get()
  findAll(@Query() { page, limit }: PaginationQueryDto) {
    return this.imagesService.findAll(page, limit);
  }

  @Post("upload-url")
  async getUploadUrl(@Req() request: FastifyRequest) {
    return this.imagesService.getUploadUrl(request.user?.id, request.user?.email);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async saveImage(@Body() dto: SaveImageDto, @Req() request: FastifyRequest) {
    return this.imagesService.saveImage(
      dto.imageId,
      dto.source,
      dto.sourceUrl,
      request.user?.id,
      request.user?.email,
    );
  }
}
