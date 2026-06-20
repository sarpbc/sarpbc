import { Injectable } from "@nestjs/common";
import {
  ListAdditionsParams,
  PandascoreGateway,
} from "../application/ports/pandascore.gateway.port";
import { PandascoreAdditionsListDto } from "./dto/addition.dto";
import { MatchDto } from "./dto/match.dto";
import { TournamentDto } from "./dto/tournament.dto";
import { PandascoreApiClient } from "./pandascore-api.client";

@Injectable()
export class PandascoreGatewayImpl implements PandascoreGateway {
  constructor(private readonly apiClient: PandascoreApiClient) {}

  listAdditions(params: ListAdditionsParams = {}): Promise<PandascoreAdditionsListDto> {
    return this.apiClient.listAdditions(params);
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

  getRocketLeaguePlayers() {
    return this.apiClient.getRocketLeaguePlayers();
  }
}
