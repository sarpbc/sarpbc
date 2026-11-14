import { stageSlug } from "@sarpbc/utils";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { Tournament } from "../domain/tournament";
import { toEventRef } from "../domain/tournament-event";
import { assertTournamentUpdateAllowed } from "../domain/tournament-source";
import { assertLineupFitsFormat } from "../domain/tournament-format";
import type { CreateTournamentInput, UpdateTournamentInput } from "./inputs";
import type { CompetitionAfterCommit } from "./after-commit";
import type { CompetitionTransaction, MatchWriter, TournamentQueries } from "./ports";
import { placeStage, requireEvent, requireLeague } from "./event-placement";
import { createOwnEvent, sharedEventSlugError, updateEvent } from "./manual-tournament-event";
import {
  assertUpdatedLineup,
  setRosters,
  syncParticipants,
  syncPlayerParticipants,
} from "./manual-tournament-lineup";
import { nonBlank } from "../../common/domain/text";

function optionalDate(value: string | null | undefined): Date | null {
  return value !== null && value !== undefined && value !== "" ? new Date(value) : null;
}

function draftTournament(input: CreateTournamentInput): Tournament {
  const tournament = new Tournament();
  tournament.source = input.source ?? "manual";
  tournament.pandascoreId = null;
  tournament.name = input.name;
  tournament.format = input.format ?? "3v3";
  tournament.hasBracket = input.hasBracket ?? false;
  assertLineupFitsFormat(tournament.format, {
    teamIds: input.teamIds ?? [],
    playerGroups: input.playerParticipants ?? [],
  });
  tournament.tier = nonBlank(input.tier) ?? null;
  tournament.imageUrl = nonBlank(input.imageUrl) ?? null;
  tournament.beginAt = optionalDate(input.beginAt);
  tournament.endAt = optionalDate(input.endAt);
  tournament.assertDateOrder();

  return tournament;
}

async function bracketToggle(
  matches: MatchWriter,
  tournamentId: string,
  hasBracket: boolean,
): Promise<boolean> {
  if (hasBracket) return true;
  const stage = await matches.bracket(tournamentId);

  if (stage.matches.some((match) => match.previousMatches.length > 0))
    throw new InvalidInputError(
      "This stage still has bracket links. Remove them from its matches before disabling the bracket.",
    );

  return false;
}

export class ManualTournamentService {
  constructor(
    private readonly reads: TournamentQueries,
    private readonly transaction: CompetitionTransaction,
    private readonly afterCommit: CompetitionAfterCommit,
  ) {}
  async create(input: CreateTournamentInput): Promise<Tournament> {
    const id = await this.transaction.run(async ({ tournaments, events }) => {
      const tournament = draftTournament(input);
      tournament.league = await requireLeague(tournaments, input.leagueId);

      if (input.eventId !== undefined && input.eventId !== "") {
        if (input.slug !== undefined) throw sharedEventSlugError();
        await placeStage(events, tournament, await requireEvent(events, input.eventId));
      } else {
        tournament.slug = stageSlug(input.name);
        tournament.event = toEventRef(await createOwnEvent(events, tournament, input.slug));
      }

      await tournaments.save(tournament);

      if (input.teamIds?.length !== undefined && input.teamIds.length !== 0)
        await syncParticipants(tournaments, tournament, input.teamIds);

      if (input.playerParticipants?.length !== undefined && input.playerParticipants.length !== 0)
        await syncPlayerParticipants(tournaments, tournament, input.playerParticipants);

      return tournament.id;
    });

    return await this.detail(id);
  }
  async update(id: string, input: UpdateTournamentInput): Promise<Tournament> {
    await this.transaction.run(async ({ tournaments, events, matches }) => {
      const tournament = await tournaments.load(id);

      if (!tournament) throw new NotFoundError(`Tournament with id "${id}" was not found.`);
      assertTournamentUpdateAllowed(tournament.source, input);
      const previousName = tournament.name;

      if (input.name !== undefined) tournament.name = input.name;

      if (input.tier !== undefined) tournament.tier = nonBlank(input.tier) ?? null;

      if (input.beginAt !== undefined)
        tournament.beginAt = input.beginAt === null ? null : new Date(input.beginAt);

      if (input.endAt !== undefined)
        tournament.endAt = input.endAt === null ? null : new Date(input.endAt);

      if (input.imageUrl !== undefined) tournament.imageUrl = nonBlank(input.imageUrl) ?? null;
      tournament.assertDateOrder();

      if (tournament.source === "pandascore") {
        if (input.endAt !== undefined) tournament.endAtCorrected = input.endAt !== null;
      } else {
        if (input.leagueId !== undefined)
          tournament.league = await requireLeague(tournaments, input.leagueId);
        await updateEvent(events, tournament, previousName, input);
        await assertUpdatedLineup(tournaments, tournament, input);

        if (input.teamIds !== undefined)
          await syncParticipants(tournaments, tournament, input.teamIds);

        if (input.playerParticipants !== undefined)
          await syncPlayerParticipants(tournaments, tournament, input.playerParticipants);

        if (input.rosters !== undefined) await setRosters(tournaments, tournament, input.rosters);

        if (input.hasBracket !== undefined)
          tournament.hasBracket = await bracketToggle(matches, tournament.id, input.hasBracket);
      }

      await tournaments.save(tournament);
    });
    await this.afterCommit.settle({ tournamentIds: [id] });

    return await this.detail(id);
  }
  async setPickemsEnabled(id: string, enabled: boolean): Promise<void> {
    await this.transaction.run(async ({ tournaments }) => {
      const tournament = await tournaments.load(id);

      if (!tournament) throw new NotFoundError("Tournament not found");
      tournament.pickemsEnabled = enabled;
      await tournaments.save(tournament);
    });
    await this.afterCommit.settle({ tournamentIds: [id] });
  }
  private async detail(id: string) {
    const tournament = await this.reads.findById(id);

    if (!tournament)
      throw new NotFoundError(`Tournament with id "${id}" was not found after save.`);

    return tournament;
  }
}
