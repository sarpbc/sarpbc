import { allocateSlug, eventSlug, stageSlug, toSlug } from "@sarpbc/utils";
import { ConflictError, InvalidInputError, NotFoundError } from "../../common/domain/errors";
import { isUuid } from "../../common/domain/entity-ref";
import { Tournament } from "../domain/competition";
import { TournamentEvent, toEventRef } from "../domain/tournament-event";
import { assertTournamentUpdateAllowed } from "../domain/tournament-source";
import type { CreateTournamentInput, UpdateTournamentInput } from "./inputs";
import type {
  CompetitionCache,
  CompetitionDiagnostics,
  CompetitionTransaction,
  EventWriter,
  TournamentQueries,
  TournamentWriter,
} from "./ports";
export class ManualTournamentService {
  constructor(
    private readonly reads: TournamentQueries,
    private readonly transaction: CompetitionTransaction,
    private readonly cache: CompetitionCache,
    private readonly diagnostics: CompetitionDiagnostics,
  ) {}
  async findLeagues() {
    return (await this.reads.leagues({ limit: 200 })).map(({ id, name }) => ({ id, name }));
  }
  async create(input: CreateTournamentInput): Promise<Tournament> {
    const id = await this.transaction.run(async ({ tournaments, events }) => {
      const tournament = new Tournament();
      tournament.source = input.source ?? "manual";
      tournament.pandascoreId = null;
      tournament.name = input.name;
      tournament.slug = stageSlug(input.name);
      tournament.tier = input.tier?.trim() || null;
      tournament.imageUrl = input.imageUrl?.trim() || null;
      tournament.beginAt = input.beginAt ? new Date(input.beginAt) : null;
      tournament.endAt = input.endAt ? new Date(input.endAt) : null;
      this.assertDateOrder(tournament);
      tournament.league = await this.league(tournaments, input.leagueId);
      const event = Object.assign(new TournamentEvent(), {
        name: input.name,
        league: tournament.league,
      });
      event.slug = input.slug
        ? await this.explicitSlug(events, input.slug, event.id)
        : await allocateSlug(eventSlug(input.name, null), (slug) => events.slugTaken(slug, null));
      await events.save(event);
      tournament.event = toEventRef(event);
      await tournaments.save(tournament);
      if (input.teamIds?.length)
        await this.syncParticipants(tournaments, tournament, input.teamIds);
      return tournament.id;
    });
    return this.detail(id);
  }
  async update(id: string, input: UpdateTournamentInput): Promise<Tournament> {
    await this.transaction.run(async ({ tournaments, events }) => {
      const tournament = await tournaments.load(id);
      if (!tournament) throw new NotFoundError('Tournament with id "' + id + '" was not found.');
      assertTournamentUpdateAllowed(tournament.source, input);
      if (input.name !== undefined) tournament.name = input.name;
      if (input.tier !== undefined) tournament.tier = input.tier?.trim() || null;
      if (input.beginAt !== undefined)
        tournament.beginAt = input.beginAt === null ? null : new Date(input.beginAt);
      if (input.endAt !== undefined)
        tournament.endAt = input.endAt === null ? null : new Date(input.endAt);
      if (input.imageUrl !== undefined) tournament.imageUrl = input.imageUrl?.trim() || null;
      this.assertDateOrder(tournament);
      if (tournament.source === "pandascore") {
        if (input.endAt !== undefined) tournament.endAtCorrected = input.endAt !== null;
      } else {
        if (input.leagueId !== undefined)
          tournament.league = await this.league(tournaments, input.leagueId);
        await this.updateEvent(events, tournament, input);
        if (input.teamIds !== undefined)
          await this.syncParticipants(tournaments, tournament, input.teamIds);
      }
      await tournaments.save(tournament);
    });
    try {
      await this.cache.invalidateTournament(id);
    } catch (error) {
      this.diagnostics.error("Tournament cache invalidation failed", error);
    }
    return this.detail(id);
  }
  private async detail(id: string) {
    const tournament = await this.reads.findById(id);
    if (!tournament)
      throw new NotFoundError('Tournament with id "' + id + '" was not found after save.');
    return tournament;
  }
  private assertDateOrder(tournament: Tournament) {
    if (tournament.beginAt && tournament.endAt && tournament.endAt < tournament.beginAt)
      throw new InvalidInputError("End date must be on or after the start date.");
  }
  private async league(writer: TournamentWriter, id: string | null | undefined) {
    if (!id) return null;
    const league = await writer.league(id);
    if (!league)
      throw new NotFoundError(
        'League with id "' + id + '" was not found. Choose a league from the list.',
      );
    return league;
  }
  /** A manual tournament is the single stage of its own event, which carries its name and URL. */
  private async updateEvent(
    events: EventWriter,
    tournament: Tournament,
    input: UpdateTournamentInput,
  ) {
    const event = await events.load(tournament.event.id);
    if (!event) throw new NotFoundError("The event of this tournament was not found.");
    event.name = tournament.name;
    event.league = tournament.league;
    if (input.slug !== undefined)
      event.slug = await this.explicitSlug(events, input.slug, event.id);
    await events.save(event);
    tournament.event = toEventRef(event);
  }
  private async explicitSlug(events: EventWriter, raw: string, eventId: string) {
    const slug = toSlug(raw);
    if (!slug || isUuid(slug))
      throw new InvalidInputError(
        "Enter a valid slug using letters, numbers, and hyphens (e.g. rlcs-2026).",
      );
    if (await events.slugTaken(slug, eventId))
      throw new ConflictError(
        `An event with the slug "${slug}" already exists. Choose a different slug.`,
      );
    return slug;
  }
  private async syncParticipants(
    writer: TournamentWriter,
    tournament: Tournament,
    teamIds: string[],
  ) {
    if (new Set(teamIds).size !== teamIds.length || !(await writer.teamsExist(teamIds)))
      throw new InvalidInputError(
        "One or more teams were not found. Refresh the team list and try again.",
      );
    const existing = await writer.participants(tournament.id),
      desired = new Set(teamIds);
    for (const p of existing) {
      if (desired.has(p.team.id)) continue;
      const refs = await writer.participantReferences(tournament.id, p.id);
      if (refs.tournamentWinner)
        throw new InvalidInputError(
          "Cannot remove a team that is the tournament winner. Clear the winner first.",
        );
      if (refs.matchParticipant)
        throw new InvalidInputError(
          "Cannot remove a team that already appears in matches. Remove or reassign those matches first.",
        );
      if (refs.matchWinner)
        throw new InvalidInputError(
          "Cannot remove a team that is recorded as a match winner. Clear those winners first.",
        );
      if (refs.results)
        throw new InvalidInputError(
          "Cannot remove a team that has match results. Remove those results first.",
        );
      await writer.removeParticipant(p.id);
    }
    const present = new Set(existing.map((p) => p.team.id));
    for (const teamId of teamIds) {
      if (!present.has(teamId))
        await writer.saveParticipant({
          id: crypto.randomUUID(),
          tournamentId: tournament.id,
          teamId,
          playerIds: [],
        });
    }
  }
}
