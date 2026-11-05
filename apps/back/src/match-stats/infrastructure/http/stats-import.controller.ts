import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import type { StatsImport as StatsImportResponse } from "@sarpbc/types";
import { AuthGuard } from "../../../auth/infrastructure/http/auth.guard";
import { RequirePermissions } from "../../../user/infrastructure/http/decorator/require-permissions.decorator";
import { PermissionGuard } from "../../../user/infrastructure/http/user.guard";
import { StatsImportService } from "../../application/stats-import.service";
import type { StatsImport } from "../../domain/stats-import";
import { StatsImportRunner } from "../stats-import.runner";
import { RequestStatsImportDto } from "./dto/request-stats-import.dto";

function present(statsImport: StatsImport): StatsImportResponse {
  return {
    ...statsImport,
    createdAt: statsImport.createdAt.toISOString(),
    startedAt: statsImport.startedAt?.toISOString() ?? null,
    finishedAt: statsImport.finishedAt?.toISOString() ?? null,
  };
}

@Controller("tournaments/:id/stats-imports")
@UseGuards(AuthGuard, PermissionGuard)
@RequirePermissions("tournaments.manage")
export class StatsImportController {
  constructor(
    private readonly service: StatsImportService,
    private readonly runner: StatsImportRunner,
  ) {}

  @Get()
  async list(@Param("id") tournamentId: string) {
    const imports = await this.service.recent(tournamentId);
    return { imports: imports.map(present) };
  }

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async request(
    @Param("id") tournamentId: string,
    @Body({ schema: RequestStatsImportDto }) dto: RequestStatsImportDto,
  ) {
    const statsImport = await this.service.request(tournamentId, dto.group);
    this.runner.start(statsImport.id);
    return present(statsImport);
  }
}
