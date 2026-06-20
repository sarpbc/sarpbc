import { Inject, Injectable } from "@nestjs/common";
import { PANDASCORE_GATEWAY, PandascoreGateway } from "./application/ports/pandascore.gateway.port";
import { MatchDto } from "./infrastructure/dto/match.dto";
import { TournamentDto } from "./infrastructure/dto/tournament.dto";

/**
 * @deprecated Prefer injecting PANDASCORE_GATEWAY in new code.
 */
@Injectable()
export class PandascoreService {
  constructor(
    @Inject(PANDASCORE_GATEWAY)
    private readonly gateway: PandascoreGateway,
  ) {}

  getTournaments(): Promise<TournamentDto[]> {
    return this.gateway.getTournaments();
  }

  getTournamentById(tournamentId: number): Promise<TournamentDto | null> {
    return this.gateway.getTournamentById(tournamentId);
  }

  getTournamentBrackets(tournamentId: number): Promise<MatchDto[]> {
    return this.gateway.getTournamentBrackets(tournamentId);
  }

  getRocketLeaguePlayers() {
    return this.gateway.getRocketLeaguePlayers();
  }
}
