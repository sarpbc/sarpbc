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
import type { SeasonAward, SeasonDetail, SeasonSummary } from "@sarpbc/types";
import { AuthGuard } from "../../../auth/infrastructure/http/auth.guard";
import { RequirePermissions } from "../../../user/infrastructure/http/decorator/require-permissions.decorator";
import { PermissionGuard } from "../../../user/infrastructure/http/user.guard";
import { SeasonService } from "../../application/season.service";
import { CreateSeasonAwardDto, SeasonDto } from "./dto/season.dto";

@Controller("seasons")
@UseGuards(AuthGuard, PermissionGuard)
@RequirePermissions("tournaments.manage")
export class SeasonController {
  constructor(private readonly seasons: SeasonService) {}

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
  create(@Body({ schema: SeasonDto }) dto: SeasonDto): Promise<SeasonSummary> {
    return this.seasons.create(dto);
  }

  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body({ schema: SeasonDto }) dto: SeasonDto,
  ): Promise<SeasonSummary> {
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
}
