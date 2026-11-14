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

    if (standings === null) return null;

    return standings.flatMap((value) => {
      const { rank, team } = standingSchema.parse(value);

      return team ? [{ teamPandascoreId: team.id, rank }] : [];
    });
  }
  async listIncidents(params: { since: Date }): Promise<CompetitionIncident[]> {
    const incidents = await this.apiClient.listIncidents(params);

    return incidents.map((v) => {
      const i = incidentSchema.parse(v);
      const base = { id: i.id, modifiedAt: new Date(i.modified_at) };

      if (i.change_type === "deletion")
        return {
          ...base,
          changeType: "deletion",
          kind: i.type,
          deletion: parseProviderDeletion(i.object),
        };
      const changeType = i.change_type;

      switch (i.type) {
        case "tournament":
          return {
            ...base,
            changeType,
            kind: i.type,
            command: toUpsertTournamentCommand(i.object),
          };
        case "match":
          return {
            ...base,
            changeType,
            kind: i.type,
            command: toUpsertMatchCommand(i.object),
          };
        case "team":
          return {
            ...base,
            changeType,
            kind: i.type,
            command: toUpsertTeamCommand(i.object),
          };
        case "player":
          return {
            ...base,
            changeType,
            kind: i.type,
            command: toImportedPlayer(i.object),
          };
        case "league":
          return {
            ...base,
            changeType,
            kind: i.type,
            command: toUpsertLeagueCommand(i.object),
          };
        case "serie":
          return {
            ...base,
            changeType,
            kind: i.type,
            command: toUpsertSerieCommand(i.object),
          };
        default: {
          const neverIncident: never = i;

          return neverIncident;
        }
      }
    });
  }
}
