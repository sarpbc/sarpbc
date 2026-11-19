import type {
  CircuitDetail,
  CircuitEventTeam,
  CircuitStandings,
  CircuitSummary,
} from "@sarpbc/types";
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
import { AuthGuard } from "../../../auth/infrastructure/http/auth.guard";
import { RequirePermissions } from "../../../user/infrastructure/http/decorator/require-permissions.decorator";
import { PermissionGuard } from "../../../user/infrastructure/http/user.guard";
import { CircuitService } from "../../application/circuit.service";
import { CreateCircuitDto, SetCircuitStageDto, UpdateCircuitDto } from "./dto/circuit.dto";
import type {
  CreateCircuitInput,
  SetCircuitStageInput,
  UpdateCircuitInput,
} from "./dto/circuit.dto";

@Controller("circuits")
export class CircuitController {
  constructor(private readonly circuits: CircuitService) {}

  @Get()
  @Header("Cache-Control", "public, max-age=60")
  async list() {
    return { circuits: await this.circuits.list() } satisfies { circuits: CircuitSummary[] };
  }

  @Get(":ref/standings")
  @Header("Cache-Control", "public, max-age=60")
  async standings(@Param("ref") ref: string) {
    return (await this.circuits.standings(ref)) satisfies CircuitStandings;
  }

  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions("tournaments.manage")
  @Get(":ref")
  async detail(@Param("ref") ref: string) {
    return (await this.circuits.detail(ref)) satisfies CircuitDetail;
  }

  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions("tournaments.manage")
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body({ schema: CreateCircuitDto }) dto: CreateCircuitInput) {
    return (await this.circuits.create(dto)) satisfies CircuitSummary;
  }

  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions("tournaments.manage")
  @Patch(":id")
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body({ schema: UpdateCircuitDto }) dto: UpdateCircuitInput,
  ) {
    return (await this.circuits.update(id, dto)) satisfies CircuitSummary;
  }

  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions("tournaments.manage")
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id", ParseUUIDPipe) id: string) {
    await this.circuits.remove(id);
  }

  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions("tournaments.manage")
  @Put(":id/stages/:tournamentId")
  async setStage(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("tournamentId", ParseUUIDPipe) tournamentId: string,
    @Body({ schema: SetCircuitStageDto }) dto: SetCircuitStageInput,
  ) {
    await this.circuits.setStageScale(id, tournamentId, dto);

    return (await this.circuits.detail(id)) satisfies CircuitDetail;
  }

  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions("tournaments.manage")
  @Get(":id/stages/:tournamentId/teams")
  async stageTeams(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("tournamentId", ParseUUIDPipe) tournamentId: string,
  ) {
    return { teams: await this.circuits.stageTeams(id, tournamentId) } satisfies {
      teams: CircuitEventTeam[];
    };
  }

  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions("tournaments.manage")
  @Delete(":id/stages/:tournamentId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeStage(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("tournamentId", ParseUUIDPipe) tournamentId: string,
  ) {
    await this.circuits.removeStage(id, tournamentId);
  }
}
