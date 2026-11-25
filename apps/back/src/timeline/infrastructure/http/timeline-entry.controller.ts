import type { StaffTimelineEntry } from "@sarpbc/types";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../../auth/infrastructure/http/auth.guard";
import { RequirePermissions } from "../../../user/infrastructure/http/decorator/require-permissions.decorator";
import { PermissionGuard } from "../../../user/infrastructure/http/user.guard";
import { TimelineService } from "../../application/timeline.service";
import { TimelineEntryDto } from "./dto/timeline.dto";
import type { TimelineEntryDtoInput } from "./dto/timeline.dto";

@Controller("timeline-entries")
@UseGuards(AuthGuard, PermissionGuard)
@RequirePermissions("tournaments.manage")
export class TimelineEntryController {
  constructor(private readonly timeline: TimelineService) {}

  @Get()
  async list() {
    return { entries: await this.timeline.list() } satisfies { entries: StaffTimelineEntry[] };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body({ schema: TimelineEntryDto }) dto: TimelineEntryDtoInput) {
    return { entry: await this.timeline.create(dto) } satisfies { entry: StaffTimelineEntry };
  }

  @Patch(":id")
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body({ schema: TimelineEntryDto }) dto: TimelineEntryDtoInput,
  ) {
    return { entry: await this.timeline.update(id, dto) } satisfies { entry: StaffTimelineEntry };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id", ParseUUIDPipe) id: string) {
    await this.timeline.remove(id);
  }
}
