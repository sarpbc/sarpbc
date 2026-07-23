import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { RequirePermissions } from "../user/decorator/require-permissions.decorator";
import { PermissionGuard } from "../user/user.guard";
import { ImagesService } from "./images.service";
import { SaveImageDto } from "./dto/save-image.dto";

@UseGuards(AuthGuard, PermissionGuard)
@RequirePermissions("images.manage")
@Controller("images")
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Post("upload-url")
  async getUploadUrl() {
    return this.imagesService.getUploadUrl();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async saveImage(@Body() dto: SaveImageDto) {
    return this.imagesService.saveImage(dto.imageId);
  }
}
