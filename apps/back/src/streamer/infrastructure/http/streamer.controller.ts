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
import type { TrackedStreamer } from "@sarpbc/types";
import { AuthGuard } from "../../../auth/infrastructure/http/auth.guard";
import { RequirePermissions } from "../../../user/infrastructure/http/decorator/require-permissions.decorator";
import { PermissionGuard } from "../../../user/infrastructure/http/user.guard";
import type { TrackedStreamer as TrackedStreamerRecord } from "../../domain/tracked-streamer";
import { StreamerService } from "../../application/streamer.service";
import { CreateStreamerDto } from "./dto/create-streamer.dto";

function mapTrackedStreamer(streamer: TrackedStreamerRecord): TrackedStreamer {
  return {
    id: streamer.id,
    login: streamer.login,
    displayName: streamer.displayName,
    createdAt: streamer.createdAt.toISOString(),
  };
}

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
  async list(): Promise<{ streamers: TrackedStreamer[] }> {
    const streamers = await this.streamerService.list();
    return { streamers: streamers.map(mapTrackedStreamer) };
  }

  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions("streamers.manage")
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body({ schema: CreateStreamerDto }) dto: CreateStreamerDto,
  ): Promise<TrackedStreamer> {
    return mapTrackedStreamer(await this.streamerService.add(dto.login, dto.displayName));
  }

  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions("streamers.manage")
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id", ParseUUIDPipe) id: string) {
    await this.streamerService.remove(id);
  }
}
