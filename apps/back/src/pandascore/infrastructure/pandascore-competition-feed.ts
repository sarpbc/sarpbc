import { Injectable } from "@nestjs/common";
import type { CompetitionFeed, CompetitionIncident } from "../../tournament/application/feed";
import { PandascoreApiClient } from "./pandascore-api.client";
import { standingSchema, tournamentSchema } from "./dto/tournament.dto";
import { matchSchema } from "./dto/match.dto";
import { incidentSchema } from "./dto/incident.dto";
import { toUpsertTournamentCommand } from "./mappers/pandascore-tournament.mapper";
import { toUpsertMatchCommand } from "./mappers/pandascore-match.mapper";
import { toUpsertTeamCommand } from "./mappers/pandascore-team.mapper";
import { toImportedPlayer } from "./mappers/pandascore-player.mapper";
import { toUpsertLeagueCommand } from "./mappers/pandascore-league.mapper";
import { toUpsertSerieCommand, parseProviderDeletion } from "./mappers/pandascore-serie.mapper";

@Injectable()
export class PandascoreCompetitionFeed implements CompetitionFeed {
  constructor(private readonly apiClient: PandascoreApiClient) {}
  async getTournaments() {
    const tournaments = await this.apiClient.getTournaments();

    return tournaments.map((v) => toUpsertTournamentCommand(tournamentSchema.parse(v)));
  }
  async getTournamentById(id: number) {
    const value = await this.apiClient.getTournamentById(id);

    return value === null ? null : toUpsertTournamentCommand(tournamentSchema.parse(value));
  }
  async getTournamentBrackets(id: number) {
    const brackets = await this.apiClient.getTournamentBrackets(id);

    return brackets.map((v) => toUpsertMatchCommand(matchSchema.parse(v)));
  }
  async getTournamentMatches(id: number) {
    const matches = await this.apiClient.getTournamentMatches(id);

    return matches.map((v) => toUpsertMatchCommand(matchSchema.parse(v)));
  }
  async getTournamentStandings(id: number) {
    const standings = await this.apiClient.getTournamentStandings(id);

    if (standings === null) {
      return null;
    }

    return standings.flatMap((value) => {
      const { rank, team } = standingSchema.parse(value);

      return team ? [{ rank, teamPandascoreId: team.id }] : [];
    });
  }
  async listIncidents(params: { since: Date }) {
    const incidents = await this.apiClient.listIncidents(params);

    return incidents.map<CompetitionIncident>((v) => {
      const i = incidentSchema.parse(v);
      const base = { id: i.id, modifiedAt: new Date(i.modified_at) };

      if (i.change_type === "deletion") {
        return {
          ...base,
          changeType: "deletion",
          deletion: parseProviderDeletion(i.object),
          kind: i.type,
        };
      }

      const changeType = i.change_type;

      switch (i.type) {
        case "tournament": {
          return {
            ...base,
            changeType,
            command: toUpsertTournamentCommand(i.object),
            kind: i.type,
          };
        }

        case "match": {
          return {
            ...base,
            changeType,
            command: toUpsertMatchCommand(i.object),
            kind: i.type,
          };
        }

        case "team": {
          return {
            ...base,
            changeType,
            command: toUpsertTeamCommand(i.object),
            kind: i.type,
          };
        }

        case "player": {
          return {
            ...base,
            changeType,
            command: toImportedPlayer(i.object),
            kind: i.type,
          };
        }

        case "league": {
          return {
            ...base,
            changeType,
            command: toUpsertLeagueCommand(i.object),
            kind: i.type,
          };
        }

        case "serie": {
          return {
            ...base,
            changeType,
            command: toUpsertSerieCommand(i.object),
            kind: i.type,
          };
        }

        default: {
          const neverIncident: never = i;

          return neverIncident;
        }
      }
    });
  }
}
