import slugify from "slugify";
import { ConflictError, InvalidInputError, NotFoundError } from "../../common/domain/errors";
import { Tournament } from "../domain/competition";
import { assertTournamentUpdateAllowed } from "../domain/tournament-source";
import type { CreateTournamentInput, UpdateTournamentInput } from "./inputs";
import type {
  CompetitionCache,
  CompetitionDiagnostics,
  CompetitionTransaction,
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
    const id = await this.transaction.run(async ({ tournaments }) => {
      const tournament = new Tournament();
      tournament.source = "manual";
      tournament.pandascoreId = null;
      tournament.name = input.name;
      tournament.slug = await this.slug(
        tournaments,
        input.slug ?? input.name,
        undefined,
        Boolean(input.slug),
      );
      tournament.tier = input.tier?.trim() || null;
      tournament.imageUrl = input.imageUrl?.trim() || null;
      tournament.beginAt = input.beginAt ? new Date(input.beginAt) : null;
      tournament.endAt = input.endAt ? new Date(input.endAt) : null;
      this.assertDateOrder(tournament);
      tournament.league = await this.league(tournaments, input.leagueId);
      await tournaments.save(tournament);
      if (input.teamIds?.length)
        await this.syncParticipants(tournaments, tournament, input.teamIds);
      return tournament.id;
    });
    return this.detail(id);
  }
  async update(id: string, input: UpdateTournamentInput): Promise<Tournament> {
    await this.transaction.run(async ({ tournaments }) => {
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
      if (tournament.source === "manual") {
        if (input.leagueId !== undefined)
          tournament.league = await this.league(tournaments, input.leagueId);
        this.assertDateOrder(tournament);
        if (input.slug !== undefined)
          tournament.slug = await this.slug(tournaments, input.slug, id, true);
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
  private async slug(
    writer: TournamentWriter,
    raw: string,
    excludeId: string | undefined,
    explicit: boolean,
  ) {
    const base = slugify(raw, { lower: true, strict: true });
    if (!base)
      throw new ConflictError(
        explicit
          ? "Enter a valid slug using letters, numbers, and hyphens (e.g. rlcs-2026)."
          : "Could not generate a URL slug from that name. Add a slug manually (letters, numbers, hyphens).",
      );
    let slug = base,
      suffix = 1;
    while (true) {
      const existing = await writer.bySlug(slug);
      if (!existing || existing.id === excludeId) return slug;
      if (explicit)
        throw new ConflictError(
          'A tournament with the slug "' + slug + '" already exists. Choose a different slug.',
        );
      slug = base + "-" + suffix++;
    }
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
