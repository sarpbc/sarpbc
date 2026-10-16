import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { AuthGuard } from "../../../auth/infrastructure/http/auth.guard";
import { RequirePermissions } from "../../../user/infrastructure/http/decorator/require-permissions.decorator";
import { PermissionGuard } from "../../../user/infrastructure/http/user.guard";
import { ImagesService } from "../../application/images.service";
import { CloudflareImagesGateway } from "../cloudflare-images.gateway";
import { SaveImageDto } from "./dto/save-image.dto";

@UseGuards(AuthGuard, PermissionGuard)
@RequirePermissions("images.manage")
@Controller("images")
export class ImagesController {
  constructor(
    private readonly imagesService: ImagesService,
    private readonly host: CloudflareImagesGateway,
  ) {}

  @Post("upload-url")
  async getUploadUrl(@Req() request: FastifyRequest) {
    return this.host.getUploadUrl(request.user?.id, request.user?.email);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async saveImage(@Body() dto: SaveImageDto) {
    return this.imagesService.saveImage(dto.imageId);
  }
}
