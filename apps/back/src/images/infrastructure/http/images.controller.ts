import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from "@nestjs/common";
import { useLogger } from "evlog/nestjs";
import type { FastifyRequest } from "fastify";
import { AuthGuard } from "../../../auth/infrastructure/http/auth.guard";
import { RequirePermissions } from "../../../user/infrastructure/http/decorator/require-permissions.decorator";
import { PermissionGuard } from "../../../user/infrastructure/http/user.guard";
import { ImagesService } from "../../application/images.service";
import { SaveImageDto } from "./dto/save-image.dto";

@UseGuards(AuthGuard, PermissionGuard)
@RequirePermissions("images.manage")
@Controller("images")
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Post("upload-url")
  async getUploadUrl(@Req() request: FastifyRequest) {
    useLogger().set({ userId: request.user?.id, userEmail: request.user?.email });

    return await this.imagesService.createUploadUrl();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async saveImage(@Body({ schema: SaveImageDto }) dto: SaveImageDto) {
    return await this.imagesService.saveImage(dto.imageId);
  }
}
