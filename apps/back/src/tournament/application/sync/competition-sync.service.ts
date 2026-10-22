import { v4 } from "uuid";
import { allocateSlug, eventSlug, stageSlug } from "@sarpbc/utils";
import { Team } from "../../../player/domain/roster";
import { Tournament, League } from "../../domain/competition";
import { TournamentEvent, eventDisplayName, toEventRef } from "../../domain/tournament-event";
import { assertPandascoreUpsertAllowed } from "../../domain/tournament-source";
import type {
  CompetitionTransaction,
  CompetitionWriteScope,
  CompetitionCache,
  CompetitionDiagnostics,
  EventWriter,
  MatchScoring,
  TournamentQueries,
} from "../ports";
import type { UpsertTournamentCommand } from "../../../pandascore/application/commands/upsert-tournament.command";
import type { UpsertLeagueCommand } from "../../../pandascore/application/commands/upsert-league.command";
import type { UpsertMatchCommand } from "../../../pandascore/application/commands/upsert-match.command";
import type { UpsertSerieCommand } from "../../../pandascore/application/commands/upsert-serie.command";
import type {
  CompetitionIncident,
  ProviderDeletion,
} from "../../../pandascore/application/models/competition-feed";
import { upsertMatchInTransaction } from "../match/write-match";

type IncidentChange = Exclude<CompetitionIncident, { changeType: "deletion" }>;
type IncidentDeletion = Extract<CompetitionIncident, { changeType: "deletion" }>;
interface Applied {
  stageIds: string[];
  matches: string[];
}
interface AppliedTournament {
  tournament: Tournament;
  stageIds: string[];
}

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
      const { tournament, stageIds } = await this.applyTournament(scope, command);
      return { tournament, stageIds, matches: await this.applyMatches(scope, tournament, matches) };
    });
    await this.afterCommit(result);
    return result.tournament;
  }
  async applyIncident(
    incident: CompetitionIncident,
    backfill?: UpsertTournamentCommand | null,
  ): Promise<void> {
    const applied = await this.transaction.run((scope) =>
      incident.changeType === "deletion"
        ? this.applyDeletion(scope, incident)
        : this.applyChange(scope, incident, backfill),
    );
    if (applied) await this.afterCommit(applied);
  }
  private async applyChange(
    scope: CompetitionWriteScope,
    incident: IncidentChange,
    backfill: UpsertTournamentCommand | null | undefined,
  ): Promise<Applied | null> {
    switch (incident.kind) {
      case "tournament":
        return {
          stageIds: (await this.applyTournament(scope, incident.command)).stageIds,
          matches: [],
        };
      case "match": {
        const pandascoreId = incident.command.tournamentPandascoreId;
        const existing = await scope.tournaments.byPandascoreId(pandascoreId);
        const applied: AppliedTournament | null = existing
          ? { tournament: existing, stageIds: [existing.id] }
          : backfill
            ? await this.applyTournament(scope, backfill)
            : null;
        if (!applied) return null;
        assertPandascoreUpsertAllowed(applied.tournament, pandascoreId);
        return {
          stageIds: applied.stageIds,
          matches: await this.applyMatches(scope, applied.tournament, [incident.command]),
        };
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
        return this.applySerie(scope.events, incident.command);
      default: {
        const neverIncident: never = incident;
        return neverIncident;
      }
    }
  }
  private async applyDeletion(
    scope: CompetitionWriteScope,
    incident: IncidentDeletion,
  ): Promise<Applied | null> {
    switch (incident.kind) {
      case "serie":
        return this.applySerieDeletion(scope, incident.id, incident.deletion);
      case "league":
      case "match":
      case "player":
      case "team":
      case "tournament":
        return null;
      default: {
        const neverKind: never = incident.kind;
        return neverKind;
      }
    }
  }
  private async applySerieDeletion(
    scope: CompetitionWriteScope,
    serieId: number,
    deletion: ProviderDeletion,
  ): Promise<Applied | null> {
    switch (deletion.kind) {
      case "merged":
        return this.mergeSerie(scope, serieId, deletion.intoId);
      case "replaced":
      case "deleted":
        return null;
      default: {
        const neverDeletion: never = deletion;
        return neverDeletion;
      }
    }
  }
  /** Renames the event a serie already owns; a serie never creates an event on its own. */
  private async applySerie(
    events: EventWriter,
    command: UpsertSerieCommand,
  ): Promise<Applied | null> {
    const event = await events.bySerieId(command.pandascoreId);
    const serieName = command.fullName?.trim();
    if (!event || !serieName) return null;
    const stages = await events.stages(event.id);
    event.name = eventDisplayName({
      leagueName: event.league?.name ?? null,
      serieName,
      stageName: stages[0]?.name ?? "",
    });
    await events.save(event);
    return { stageIds: stages.map((stage) => stage.id), matches: [] };
  }
  /**
   * A merged serie keeps its URL when the target serie has no event yet. Otherwise its stages
   * join the target event and the old event slug stops resolving.
   */
  private async mergeSerie(
    scope: CompetitionWriteScope,
    serieId: number,
    intoId: number,
  ): Promise<Applied | null> {
    const from = await scope.events.bySerieId(serieId);
    if (!from) return null;
    const stages = await scope.events.stages(from.id);
    const stageIds = stages.map((stage) => stage.id);
    const into = await scope.events.bySerieId(intoId);
    if (!into) {
      from.pandascoreSerieId = intoId;
      await scope.events.save(from);
      return { stageIds, matches: [] };
    }
    for (const stage of stages) {
      const tournament = await scope.tournaments.load(stage.id);
      if (!tournament) continue;
      await this.placeStage(scope.events, tournament, into);
      await scope.tournaments.save(tournament);
    }
    await scope.events.remove(from.id);
    return { stageIds, matches: [] };
  }
  private async applyTournament(
    scope: CompetitionWriteScope,
    command: UpsertTournamentCommand,
  ): Promise<AppliedTournament> {
    const existing = await scope.tournaments.byPandascoreId(command.pandascoreId);
    if (existing) assertPandascoreUpsertAllowed(existing, command.pandascoreId);
    const tournament =
      existing ?? Object.assign(new Tournament(), { pandascoreId: command.pandascoreId });
    tournament.source = "pandascore";
    tournament.name = command.name;
    tournament.tier = command.tier ?? null;
    tournament.beginAt = command.beginAt ?? null;
    tournament.endAt = command.endAt ?? null;
    tournament.prizepool = command.prizepool ?? null;
    tournament.type = command.type ?? null;
    tournament.country = command.country ?? null;
    tournament.hasBracket = command.hasBracket ?? false;
    tournament.winnerType = command.winnerType ?? null;
    tournament.league = command.league ? await this.applyLeague(scope, command.league) : null;
    const previousEventId = existing?.event.id ?? null;
    const { event, renamed } = await this.resolveEvent(
      scope.events,
      previousEventId,
      command,
      tournament.league,
    );
    if (event.id === previousEventId) tournament.event = toEventRef(event);
    else await this.placeStage(scope.events, tournament, event);
    await scope.tournaments.save(tournament);
    if (previousEventId && previousEventId !== event.id) {
      const remaining = await scope.events.stages(previousEventId);
      if (!remaining.length) await scope.events.remove(previousEventId);
    }
    const participants = await scope.tournaments.participants(tournament.id);
    for (const roster of command.expectedRoster ?? []) {
      const team = await scope.rosters.upsertTeam(roster.team),
        existingParticipant = participants.find((p) => p.team.id === team.id),
        playerIds: string[] = [];
      for (const player of roster.players)
        playerIds.push((await scope.rosters.upsertPlayer(player)).id);
      const participantId = existingParticipant?.id ?? v4();
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
          team:
            existingParticipant?.team ?? Object.assign(new Team(), { ...roster.team, id: team.id }),
          players: [],
          createdAt: existingParticipant?.createdAt ?? new Date(),
          updatedAt: new Date(),
        };
      }
    }
    await scope.tournaments.save(tournament);
    const siblings = renamed ? (await scope.events.stages(event.id)).map((stage) => stage.id) : [];
    return { tournament, stageIds: [...new Set([tournament.id, ...siblings])] };
  }
  /**
   * Ordered identity lookup: the serie's event, then the stage's own event or a same-named event
   * in the league while either still lacks a serie (backfilled events claim their serie on first
   * sync instead of duplicating under a `-2` slug), else a new event with a frozen slug.
   */
  private async resolveEvent(
    events: EventWriter,
    currentEventId: string | null,
    command: UpsertTournamentCommand,
    league: League | null,
  ): Promise<{ event: TournamentEvent; renamed: boolean }> {
    const serie = command.serie;
    const name = eventDisplayName({
      leagueName: league?.name ?? null,
      serieName: serie?.fullName ?? null,
      stageName: command.name,
    });
    const current = currentEventId ? await events.load(currentEventId) : null;
    const unclaimedCurrent = current?.pandascoreSerieId === null ? current : null;
    const lookups: Array<() => Promise<TournamentEvent | null>> = serie
      ? [
          () => events.bySerieId(serie.pandascoreId),
          async () => unclaimedCurrent,
          () => events.unclaimedByName(league?.id ?? null, name),
        ]
      : [async () => unclaimedCurrent];
    let found: TournamentEvent | null = null;
    for (const lookup of lookups) {
      found = await lookup();
      if (found) break;
    }
    const event = found ?? new TournamentEvent();
    if (!found) {
      const year = serie?.year ?? command.beginAt?.getUTCFullYear() ?? null;
      event.slug = await allocateSlug(eventSlug(name, year), (slug) =>
        events.slugTaken(slug, null),
      );
    }
    const renamed = found !== null && found.name !== name;
    event.pandascoreSerieId = serie?.pandascoreId ?? event.pandascoreSerieId;
    event.name = name;
    event.league = league;
    await events.save(event);
    return { event, renamed };
  }
  private async placeStage(events: EventWriter, tournament: Tournament, event: TournamentEvent) {
    tournament.slug = await allocateSlug(stageSlug(tournament.name), (slug) =>
      events.stageSlugTaken(event.id, slug, tournament.id),
    );
    tournament.event = toEventRef(event);
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
  private async afterCommit({ stageIds, matches }: Applied) {
    for (const id of stageIds) {
      try {
        await this.cache.invalidateTournament(id);
      } catch (error) {
        this.diagnostics.error("Tournament cache invalidation failed", error);
      }
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
