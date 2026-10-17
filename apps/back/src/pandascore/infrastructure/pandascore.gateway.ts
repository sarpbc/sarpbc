import { Injectable } from "@nestjs/common";
import type {
  ListIncidentsParams,
  PandascoreGateway,
} from "../application/ports/pandascore.gateway.port";
import type { CompetitionIncident, ImportedPlayer } from "../application/models/competition-feed";
import { PandascoreApiClient } from "./pandascore-api.client";
import { tournamentSchema } from "./dto/tournament.dto";
import { matchSchema } from "./dto/match.dto";
import { currentPlayerSchema, incidentSchema } from "./dto/incident.dto";
import { PandascoreTournamentMapper } from "./mappers/pandascore-tournament.mapper";
import { PandascoreMatchMapper } from "./mappers/pandascore-match.mapper";
import { PandascoreTeamMapper } from "./mappers/pandascore-team.mapper";
import { PandascorePlayerMapper } from "./mappers/pandascore-player.mapper";
import { PandascoreLeagueMapper } from "./mappers/pandascore-league.mapper";
@Injectable()
export class PandascoreGatewayImpl implements PandascoreGateway {
  constructor(private readonly apiClient: PandascoreApiClient) {}
  async getTournaments() {
    return (await this.apiClient.getTournaments()).map((v) =>
      PandascoreTournamentMapper.toUpsertCommand(tournamentSchema.parse(v)),
    );
  }
  async getTournamentById(id: number) {
    const value = await this.apiClient.getTournamentById(id);
    return value === null
      ? null
      : PandascoreTournamentMapper.toUpsertCommand(tournamentSchema.parse(value));
  }
  async getTournamentBrackets(id: number) {
    return (await this.apiClient.getTournamentBrackets(id)).map((v) =>
      PandascoreMatchMapper.toUpsertCommand(matchSchema.parse(v)),
    );
  }
  async getTournamentMatches(id: number) {
    return (await this.apiClient.getTournamentMatches(id)).map((v) =>
      PandascoreMatchMapper.toUpsertCommand(matchSchema.parse(v)),
    );
  }
  async getRocketLeaguePlayers(): Promise<ImportedPlayer[]> {
    return (await this.apiClient.getRocketLeaguePlayers()).map((v) => {
      const p = currentPlayerSchema.parse(v);
      return {
        player: PandascorePlayerMapper.toUpsertCommand(p),
        currentTeam: p.current_team ? PandascoreTeamMapper.toUpsertCommand(p.current_team) : null,
      };
    });
  }
  async listIncidents(params: ListIncidentsParams = {}): Promise<CompetitionIncident[]> {
    return (await this.apiClient.listIncidents(params)).map((v) => {
      const i = incidentSchema.parse(v),
        base = { id: i.id, modifiedAt: new Date(i.modified_at) };
      if (i.change_type === "deletion") return { ...base, changeType: "deletion", kind: i.type };
      const changeType = i.change_type;
      switch (i.type) {
        case "tournament":
          return {
            ...base,
            changeType,
            kind: i.type,
            command: PandascoreTournamentMapper.toUpsertCommand(i.object),
          };
        case "match":
          return {
            ...base,
            changeType,
            kind: i.type,
            command: PandascoreMatchMapper.toUpsertCommand(i.object),
          };
        case "team":
          return {
            ...base,
            changeType,
            kind: i.type,
            command: PandascoreTeamMapper.toUpsertCommand(i.object),
          };
        case "player":
          return {
            ...base,
            changeType,
            kind: i.type,
            command: {
              player: PandascorePlayerMapper.toUpsertCommand(i.object),
              currentTeam: i.object.current_team
                ? PandascoreTeamMapper.toUpsertCommand(i.object.current_team)
                : null,
            },
          };
        case "league":
          return {
            ...base,
            changeType,
            kind: i.type,
            command: PandascoreLeagueMapper.toUpsertCommand(i.object),
          };
        case "serie":
          return { ...base, changeType, kind: i.type };
        default: {
          const neverIncident: never = i;
          return neverIncident;
        }
      }
    });
  }
}
