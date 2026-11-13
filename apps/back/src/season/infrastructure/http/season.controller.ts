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
import type {
  SeasonAward,
  SeasonDetail,
  SeasonParticipant,
  SeasonPathEntry,
  SeasonSummary,
} from "@sarpbc/types";
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

@Controller("seasons")
@UseGuards(AuthGuard, PermissionGuard)
@RequirePermissions("tournaments.manage")
export class SeasonController {
  constructor(
    private readonly seasons: SeasonService,
    private readonly archives: SeasonArchiveService,
  ) {}

  @Get()
  async list(): Promise<{ seasons: SeasonSummary[] }> {
    return { seasons: await this.seasons.list() };
  }

  @Get(":id")
  detail(@Param("id", ParseUUIDPipe) id: string): Promise<SeasonDetail> {
    return this.seasons.detail(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body({ schema: SeasonDto }) dto: SeasonDto): Promise<SeasonDetail> {
    return this.seasons.create(dto);
  }

  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body({ schema: SeasonDto }) dto: SeasonDto,
  ): Promise<SeasonDetail> {
    return this.seasons.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    await this.seasons.remove(id);
  }

  @Post(":id/awards")
  @HttpCode(HttpStatus.CREATED)
  async addAward(
    @Param("id", ParseUUIDPipe) id: string,
    @Body({ schema: CreateSeasonAwardDto }) dto: CreateSeasonAwardDto,
  ): Promise<{ award: SeasonAward }> {
    return { award: await this.seasons.addAward(id, dto) };
  }

  @Delete(":id/awards/:awardId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAward(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("awardId", ParseUUIDPipe) awardId: string,
  ): Promise<void> {
    await this.seasons.removeAward(id, awardId);
  }

  @Post(":id/participants")
  @HttpCode(HttpStatus.CREATED)
  async addParticipant(
    @Param("id", ParseUUIDPipe) id: string,
    @Body({ schema: CreateSeasonParticipantDto }) dto: CreateSeasonParticipantDto,
  ): Promise<{ participant: SeasonParticipant }> {
    return { participant: await this.archives.addParticipant(id, dto) };
  }

  @Patch(":id/participants/:participantId")
  async updateParticipant(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("participantId", ParseUUIDPipe) participantId: string,
    @Body({ schema: UpdateSeasonParticipantDto }) dto: UpdateSeasonParticipantDto,
  ): Promise<{ participant: SeasonParticipant }> {
    return {
      participant: await this.archives.updatePathNote(id, participantId, dto.pathNote),
    };
  }

  @Delete(":id/participants/:participantId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeParticipant(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("participantId", ParseUUIDPipe) participantId: string,
  ): Promise<void> {
    await this.archives.removeParticipant(id, participantId);
  }

  @Post(":id/participants/:participantId/path")
  @HttpCode(HttpStatus.CREATED)
  async addPathEntry(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("participantId", ParseUUIDPipe) participantId: string,
    @Body({ schema: CreateSeasonPathEntryDto }) dto: CreateSeasonPathEntryDto,
  ): Promise<{ entry: SeasonPathEntry }> {
    return { entry: await this.archives.addPathEntry(id, participantId, dto) };
  }

  @Delete(":id/participants/:participantId/path/:entryId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePathEntry(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("participantId", ParseUUIDPipe) participantId: string,
    @Param("entryId", ParseUUIDPipe) entryId: string,
  ): Promise<void> {
    await this.archives.removePathEntry(id, participantId, entryId);
  }
}
