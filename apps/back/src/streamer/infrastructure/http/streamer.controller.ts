import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../../auth/infrastructure/http/auth.guard";
import { RequirePermissions } from "../../../user/infrastructure/http/decorator/require-permissions.decorator";
import { PermissionGuard } from "../../../user/infrastructure/http/user.guard";
import { StreamerService } from "../../application/streamer.service";
import { CreateStreamerDto } from "./dto/create-streamer.dto";

@Controller("streamers")
export class StreamerController {
  constructor(private readonly streamerService: StreamerService) {}

  @Get("live")
  @Header("Cache-Control", "public, max-age=60")
  async listLive() {
    const streamers = await this.streamerService.listLive();
    return { streamers };
  }

  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions("streamers.manage")
  @Get()
  async list() {
    const streamers = await this.streamerService.list();
    return { streamers };
  }

  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions("streamers.manage")
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body({ schema: CreateStreamerDto }) dto: CreateStreamerDto) {
    return this.streamerService.add(dto.login, dto.displayName);
  }

  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions("streamers.manage")
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id", ParseUUIDPipe) id: string) {
    await this.streamerService.remove(id);
  }
}
