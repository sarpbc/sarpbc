import type {
  SeasonAward,
  SeasonDetail,
  SeasonParticipant,
  SeasonPathEntry,
  SeasonSummary,
} from "@sarpbc/types";
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
import { SeasonArchiveService } from "../../application/season-archive.service";
import { SeasonService } from "../../application/season.service";
import {
  CreateSeasonAwardDto,
  CreateSeasonParticipantDto,
  CreateSeasonPathEntryDto,
  SeasonDto,
  UpdateSeasonParticipantDto,
} from "./dto/season.dto";
import type {
  CreateSeasonAwardInput,
  CreateSeasonParticipantInput,
  CreateSeasonPathEntryInput,
  SeasonInput,
  UpdateSeasonParticipantInput,
} from "./dto/season.dto";

@Controller("seasons")
@UseGuards(AuthGuard, PermissionGuard)
@RequirePermissions("tournaments.manage")
export class SeasonController {
  constructor(
    private readonly seasons: SeasonService,
    private readonly archives: SeasonArchiveService,
  ) {}

  @Get()
  async list() {
    return { seasons: await this.seasons.list() } satisfies { seasons: SeasonSummary[] };
  }

  @Get(":id")
  async detail(@Param("id", ParseUUIDPipe) id: string) {
    return (await this.seasons.detail(id)) satisfies SeasonDetail;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body({ schema: SeasonDto }) dto: SeasonInput) {
    return (await this.seasons.create(dto)) satisfies SeasonDetail;
  }

  @Patch(":id")
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body({ schema: SeasonDto }) dto: SeasonInput,
  ) {
    return (await this.seasons.update(id, dto)) satisfies SeasonDetail;
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id", ParseUUIDPipe) id: string) {
    await this.seasons.remove(id);
  }

  @Post(":id/awards")
  @HttpCode(HttpStatus.CREATED)
  async addAward(
    @Param("id", ParseUUIDPipe) id: string,
    @Body({ schema: CreateSeasonAwardDto }) dto: CreateSeasonAwardInput,
  ) {
    return { award: await this.seasons.addAward(id, dto) } satisfies { award: SeasonAward };
  }

  @Delete(":id/awards/:awardId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAward(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("awardId", ParseUUIDPipe) awardId: string,
  ) {
    await this.seasons.removeAward(id, awardId);
  }

  @Post(":id/participants")
  @HttpCode(HttpStatus.CREATED)
  async addParticipant(
    @Param("id", ParseUUIDPipe) id: string,
    @Body({ schema: CreateSeasonParticipantDto }) dto: CreateSeasonParticipantInput,
  ) {
    return { participant: await this.archives.addParticipant(id, dto) } satisfies {
      participant: SeasonParticipant;
    };
  }

  @Patch(":id/participants/:participantId")
  async updateParticipant(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("participantId", ParseUUIDPipe) participantId: string,
    @Body({ schema: UpdateSeasonParticipantDto }) dto: UpdateSeasonParticipantInput,
  ) {
    return {
      participant: await this.archives.updatePathNote(id, participantId, dto.pathNote),
    } satisfies { participant: SeasonParticipant };
  }

  @Delete(":id/participants/:participantId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeParticipant(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("participantId", ParseUUIDPipe) participantId: string,
  ) {
    await this.archives.removeParticipant(id, participantId);
  }

  @Post(":id/participants/:participantId/path")
  @HttpCode(HttpStatus.CREATED)
  async addPathEntry(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("participantId", ParseUUIDPipe) participantId: string,
    @Body({ schema: CreateSeasonPathEntryDto }) dto: CreateSeasonPathEntryInput,
  ) {
    return { entry: await this.archives.addPathEntry(id, participantId, dto) } satisfies {
      entry: SeasonPathEntry;
    };
  }

  @Delete(":id/participants/:participantId/path/:entryId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePathEntry(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("participantId", ParseUUIDPipe) participantId: string,
    @Param("entryId", ParseUUIDPipe) entryId: string,
  ) {
    await this.archives.removePathEntry(id, participantId, entryId);
  }
}
