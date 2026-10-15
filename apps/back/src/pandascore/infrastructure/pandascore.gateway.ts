import { Injectable } from "@nestjs/common";
import {
  ListIncidentsParams,
  PandascoreGateway,
} from "../application/ports/pandascore.gateway.port";
import { PandascoreIncidentsListDto } from "./dto/incident.dto";
import { MatchDto } from "./dto/match.dto";
import { TournamentDto } from "./dto/tournament.dto";
import { PandascoreApiClient } from "./pandascore-api.client";

@Injectable()
export class PandascoreGatewayImpl implements PandascoreGateway {
  constructor(private readonly apiClient: PandascoreApiClient) {}

  listIncidents(params: ListIncidentsParams = {}): Promise<PandascoreIncidentsListDto> {
    return this.apiClient.listIncidents(params);
  }

  getTournaments(): Promise<TournamentDto[]> {
    return this.apiClient.getTournaments();
  }

  getTournamentById(tournamentId: number): Promise<TournamentDto | null> {
    return this.apiClient.getTournamentById(tournamentId);
  }

  getTournamentBrackets(tournamentId: number): Promise<MatchDto[]> {
    return this.apiClient.getTournamentBrackets(tournamentId);
  }

  getTournamentMatches(tournamentId: number): Promise<MatchDto[]> {
    return this.apiClient.getTournamentMatches(tournamentId);
  }

  getRocketLeaguePlayers() {
    return this.apiClient.getRocketLeaguePlayers();
  }
}
