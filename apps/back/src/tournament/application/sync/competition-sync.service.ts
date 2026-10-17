import { v4 } from "uuid";
import { Team } from "../../../player/domain/roster";
import { Tournament, League } from "../../domain/competition";
import { assertPandascoreUpsertAllowed } from "../../domain/tournament-source";
import type {
  CompetitionTransaction,
  CompetitionWriteScope,
  CompetitionCache,
  CompetitionDiagnostics,
  MatchScoring,
  TournamentQueries,
} from "../ports";
import type { UpsertTournamentCommand } from "../../../pandascore/application/commands/upsert-tournament.command";
import type { UpsertLeagueCommand } from "../../../pandascore/application/commands/upsert-league.command";
import type { UpsertMatchCommand } from "../../../pandascore/application/commands/upsert-match.command";
import type { CompetitionIncident } from "../../../pandascore/application/models/competition-feed";
import { upsertMatchInTransaction } from "../match/write-match";
export class CompetitionSyncService {
  constructor(
    private readonly reads: TournamentQueries,
    private readonly transaction: CompetitionTransaction,
    private readonly cache: CompetitionCache,
    private readonly scoring: MatchScoring,
    private readonly diagnostics: CompetitionDiagnostics,
  ) {}
  findTournamentById(id: string) {
    return this.reads.findById(id);
  }
  findTournamentByPandascoreId(id: number) {
    return this.reads.findByPandascoreId(id);
  }
  getKnownTournamentPandascoreIds() {
    return this.reads.knownPandascoreIds();
  }
  async upsertTournament(
    command: UpsertTournamentCommand,
    matches: UpsertMatchCommand[] = [],
  ): Promise<Tournament> {
    const result = await this.transaction.run(async (scope) => {
      const tournament = await this.applyTournament(scope, command);
      const completed = await this.applyMatches(scope, tournament, matches);
      return { tournament, completed };
    });
    await this.afterCommit(result.tournament.id, result.completed);
    return result.tournament;
  }
  async upsertMatchesForTournament(
    tournament: Tournament,
    commands: UpsertMatchCommand[],
  ): Promise<number> {
    const ids = await this.transaction.run((scope) =>
      this.applyMatches(scope, tournament, commands),
    );
    await this.afterCommit(tournament.id, ids);
    return ids.length;
  }
  async applyIncident(
    incident: Exclude<CompetitionIncident, { changeType: "deletion" }>,
    backfill?: UpsertTournamentCommand | null,
  ): Promise<void> {
    const result = await this.transaction.run(async (scope) => {
      switch (incident.kind) {
        case "tournament": {
          const t = await this.applyTournament(scope, incident.command);
          return { id: t.id, matches: [] };
        }
        case "match": {
          let t = await scope.tournaments.byPandascoreId(incident.command.tournamentPandascoreId);
          if (!t && backfill) t = await this.applyTournament(scope, backfill);
          if (!t) return null;
          assertPandascoreUpsertAllowed(t, incident.command.tournamentPandascoreId);
          return { id: t.id, matches: await this.applyMatches(scope, t, [incident.command]) };
        }
        case "team":
          await scope.rosters.upsertTeam(incident.command);
          return null;
        case "player": {
          const currentTeam = incident.command.currentTeam
            ? await scope.rosters.upsertTeam(incident.command.currentTeam)
            : null;
          await scope.rosters.upsertPlayer(incident.command.player, currentTeam?.id ?? null);
          return null;
        }
        case "league":
          await this.applyLeague(scope, incident.command);
          return null;
        case "serie":
          return null;
        default: {
          const neverIncident: never = incident;
          return neverIncident;
        }
      }
    });
    if (result) await this.afterCommit(result.id, result.matches);
  }
  private async applyTournament(
    scope: CompetitionWriteScope,
    command: UpsertTournamentCommand,
  ): Promise<Tournament> {
    let tournament = await scope.tournaments.byPandascoreId(command.pandascoreId);
    if (tournament) assertPandascoreUpsertAllowed(tournament, command.pandascoreId);
    if (!tournament) {
      tournament = new Tournament();
      tournament.pandascoreId = command.pandascoreId;
    }
    tournament.source = "pandascore";
    tournament.name = command.name;
    tournament.slug = tournament.slug ?? command.slug ?? null;
    tournament.serie = command.serie ?? null;
    tournament.tier = command.tier ?? null;
    tournament.beginAt = command.beginAt ?? null;
    tournament.endAt = command.endAt ?? null;
    tournament.prizepool = command.prizepool ?? null;
    tournament.type = command.type ?? null;
    tournament.country = command.country ?? null;
    tournament.hasBracket = command.hasBracket ?? false;
    tournament.winnerType = command.winnerType ?? null;
    tournament.league = command.league ? await this.applyLeague(scope, command.league) : null;
    await scope.tournaments.save(tournament);
    const participants = await scope.tournaments.participants(tournament.id);
    for (const roster of command.expectedRoster ?? []) {
      const team = await scope.rosters.upsertTeam(roster.team),
        existing = participants.find((p) => p.team.id === team.id),
        playerIds: string[] = [];
      for (const player of roster.players)
        playerIds.push((await scope.rosters.upsertPlayer(player)).id);
      const participantId = existing?.id ?? v4();
      await scope.tournaments.saveParticipant({
        id: participantId,
        tournamentId: tournament.id,
        teamId: team.id,
        playerIds,
      });
      if (roster.team.pandascoreId === command.winnerPandascoreTeamId) {
        // Winner identity is sufficient for persistence; full roster views are reloaded after commit.
        tournament.winner = {
          id: participantId,
          tournamentId: tournament.id,
          team: existing?.team ?? Object.assign(new Team(), { ...roster.team, id: team.id }),
          players: [],
          createdAt: existing?.createdAt ?? new Date(),
          updatedAt: new Date(),
        };
      }
    }
    await scope.tournaments.save(tournament);
    return tournament;
  }
  private async applyLeague(scope: CompetitionWriteScope, command: UpsertLeagueCommand) {
    let league = await scope.tournaments.leagueByPandascoreId(command.pandascoreId);
    if (!league) {
      league = new League();
      league.pandascoreId = command.pandascoreId;
    }
    league.name = command.name;
    league.slug = league.slug ?? command.slug ?? null;
    league.url = command.url ?? null;
    league.imageUrl = league.imageUrl ?? command.imageUrl ?? null;
    league.modifiedAt = command.modifiedAt ?? null;
    await scope.tournaments.saveLeague(league);
    return league;
  }
  private async applyMatches(
    scope: CompetitionWriteScope,
    tournament: Tournament,
    commands: UpsertMatchCommand[],
  ): Promise<string[]> {
    const participants = await scope.tournaments.participants(tournament.id),
      ids: string[] = [];
    for (const command of [...commands].sort(
      (a, b) => (a.beginAt?.getTime() ?? 0) - (b.beginAt?.getTime() ?? 0),
    )) {
      if (!command.beginAt) continue;
      const participantIds = (
        command.opponentPandascoreIds?.length
          ? command.opponentPandascoreIds.map(
              (id) => participants.find((p) => p.team.pandascoreId === id)?.id,
            )
          : command.opponentSlugs.map((slug) => participants.find((p) => p.team.slug === slug)?.id)
      ).filter((id): id is string => Boolean(id));
      const match = await upsertMatchInTransaction(scope.matches, tournament.id, {
        ...command,
        participantIds,
        previous_matches: command.previousMatches.map((p) => ({
          type: p.type,
          match_id: p.matchPandascoreId,
        })),
        results: command.results.map((r) => ({
          participantId:
            participants.find((p) => p.team.pandascoreId === r.teamPandascoreId)?.id ?? null,
          score: r.score,
        })),
      });
      if (match.winner && (match.status === "finished" || match.endAt)) ids.push(match.id);
    }
    return ids;
  }
  private async afterCommit(id: string, matches: string[]) {
    try {
      await this.cache.invalidateTournament(id);
    } catch (error) {
      this.diagnostics.error("Tournament cache invalidation failed", error);
    }
    for (const matchId of matches) {
      try {
        await this.scoring.autoScoreMatch(matchId);
      } catch (error) {
        this.diagnostics.error("Automatic match scoring failed", error);
      }
    }
  }
}
