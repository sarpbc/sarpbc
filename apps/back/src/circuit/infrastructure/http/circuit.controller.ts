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
  Patch,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import type { CircuitDetail, CircuitStandings, CircuitSummary } from "@sarpbc/types";
import { AuthGuard } from "../../../auth/infrastructure/http/auth.guard";
import { RequirePermissions } from "../../../user/infrastructure/http/decorator/require-permissions.decorator";
import { PermissionGuard } from "../../../user/infrastructure/http/user.guard";
import { CircuitService } from "../../application/circuit.service";
import { CreateCircuitDto, SetCircuitStageDto, UpdateCircuitDto } from "./dto/circuit.dto";

@Controller("circuits")
export class CircuitController {
  constructor(private readonly circuits: CircuitService) {}

  @Get()
  @Header("Cache-Control", "public, max-age=60")
  async list(): Promise<{ circuits: CircuitSummary[] }> {
    return { circuits: await this.circuits.list() };
  }

  @Get(":ref/standings")
  @Header("Cache-Control", "public, max-age=60")
  standings(@Param("ref") ref: string): Promise<CircuitStandings> {
    return this.circuits.standings(ref);
  }

  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions("tournaments.manage")
  @Get(":ref")
  detail(@Param("ref") ref: string): Promise<CircuitDetail> {
    return this.circuits.detail(ref);
  }

  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions("tournaments.manage")
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body({ schema: CreateCircuitDto }) dto: CreateCircuitDto): Promise<CircuitSummary> {
    return this.circuits.create(dto);
  }

  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions("tournaments.manage")
  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body({ schema: UpdateCircuitDto }) dto: UpdateCircuitDto,
  ): Promise<CircuitSummary> {
    return this.circuits.update(id, dto);
  }

  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions("tournaments.manage")
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    await this.circuits.remove(id);
  }

  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions("tournaments.manage")
  @Put(":id/stages/:tournamentId")
  async setStage(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("tournamentId", ParseUUIDPipe) tournamentId: string,
    @Body({ schema: SetCircuitStageDto }) dto: SetCircuitStageDto,
  ): Promise<CircuitDetail> {
    await this.circuits.setStageScale(id, tournamentId, dto.scale, dto.sourceUrl);
    return this.circuits.detail(id);
  }

  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions("tournaments.manage")
  @Delete(":id/stages/:tournamentId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeStage(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("tournamentId", ParseUUIDPipe) tournamentId: string,
  ): Promise<void> {
    await this.circuits.removeStage(id, tournamentId);
  }
}
