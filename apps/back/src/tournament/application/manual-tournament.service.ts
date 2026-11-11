import { allocateSlug, eventSlug, stageSlug, toSlug } from "@sarpbc/utils";
import { InvalidInputError, NotFoundError } from "../../common/domain/errors";
import {
  Tournament,
  assertParticipantRemovable,
  type TournamentParticipant,
} from "../domain/competition";
import { TournamentEvent, ownsEvent, toEventRef } from "../domain/tournament-event";
import { assertTournamentUpdateAllowed } from "../domain/tournament-source";
import { assertLineupFitsFormat, playerGroupKey } from "../domain/tournament-format";
import type {
  CreateTournamentInput,
  ParticipantRosterInput,
  UpdateTournamentInput,
} from "./inputs";
import type { CompetitionAfterCommit } from "./after-commit";
import type {
  CompetitionTransaction,
  EventWriter,
  TournamentQueries,
  TournamentWriter,
} from "./ports";
import { explicitEventSlug, placeStage, requireEvent, requireLeague } from "./event-placement";
export class ManualTournamentService {
  constructor(
    private readonly reads: TournamentQueries,
    private readonly transaction: CompetitionTransaction,
    private readonly afterCommit: CompetitionAfterCommit,
  ) {}
  async create(input: CreateTournamentInput): Promise<Tournament> {
    const id = await this.transaction.run(async ({ tournaments, events }) => {
      const tournament = new Tournament();
      tournament.source = input.source ?? "manual";
      tournament.pandascoreId = null;
      tournament.name = input.name;
      tournament.format = input.format ?? "3v3";
      assertLineupFitsFormat(tournament.format, {
        teamIds: input.teamIds ?? [],
        playerGroups: input.playerParticipants ?? [],
      });
      tournament.tier = input.tier?.trim() || null;
      tournament.imageUrl = input.imageUrl?.trim() || null;
      tournament.beginAt = input.beginAt ? new Date(input.beginAt) : null;
      tournament.endAt = input.endAt ? new Date(input.endAt) : null;
      tournament.assertDateOrder();
      tournament.league = await requireLeague(tournaments, input.leagueId);
      if (input.eventId) {
        if (input.slug !== undefined) throw sharedEventSlugError();
        await placeStage(events, tournament, await requireEvent(events, input.eventId));
      } else {
        tournament.slug = stageSlug(input.name);
        tournament.event = toEventRef(await this.createOwnEvent(events, tournament, input.slug));
      }
      await tournaments.save(tournament);
      if (input.teamIds?.length)
        await this.syncParticipants(tournaments, tournament, input.teamIds);
      if (input.playerParticipants?.length)
        await this.syncPlayerParticipants(tournaments, tournament, input.playerParticipants);
      return tournament.id;
    });
    return this.detail(id);
  }
  async update(id: string, input: UpdateTournamentInput): Promise<Tournament> {
    await this.transaction.run(async ({ tournaments, events }) => {
      const tournament = await tournaments.load(id);
      if (!tournament) throw new NotFoundError('Tournament with id "' + id + '" was not found.');
      assertTournamentUpdateAllowed(tournament.source, input);
      const previousName = tournament.name;
      if (input.name !== undefined) tournament.name = input.name;
      if (input.tier !== undefined) tournament.tier = input.tier?.trim() || null;
      if (input.beginAt !== undefined)
        tournament.beginAt = input.beginAt === null ? null : new Date(input.beginAt);
      if (input.endAt !== undefined)
        tournament.endAt = input.endAt === null ? null : new Date(input.endAt);
      if (input.imageUrl !== undefined) tournament.imageUrl = input.imageUrl?.trim() || null;
      tournament.assertDateOrder();
      if (tournament.source === "pandascore") {
        if (input.endAt !== undefined) tournament.endAtCorrected = input.endAt !== null;
      } else {
        if (input.leagueId !== undefined)
          tournament.league = await requireLeague(tournaments, input.leagueId);
        await this.updateEvent(events, tournament, previousName, input);
        await this.assertUpdatedLineup(tournaments, tournament, input);
        if (input.teamIds !== undefined)
          await this.syncParticipants(tournaments, tournament, input.teamIds);
        if (input.playerParticipants !== undefined)
          await this.syncPlayerParticipants(tournaments, tournament, input.playerParticipants);
        if (input.rosters !== undefined)
          await this.setRosters(tournaments, tournament, input.rosters);
      }
      await tournaments.save(tournament);
    });
    await this.afterCommit.settle({ tournamentIds: [id] });
    return this.detail(id);
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
      throw new NotFoundError('Tournament with id "' + id + '" was not found after save.');
    return tournament;
  }
  private async createOwnEvent(
    events: EventWriter,
    tournament: Tournament,
    slug: string | undefined,
  ): Promise<TournamentEvent> {
    const event = Object.assign(new TournamentEvent(), {
      name: tournament.name,
      league: tournament.league,
    });
    event.slug = slug
      ? await explicitEventSlug(events, slug, event.id)
      : await allocateSlug(eventSlug(tournament.name, null), (taken) =>
          events.slugTaken(taken, null),
        );
    await events.save(event);
    return event;
  }
  private async updateEvent(
    events: EventWriter,
    tournament: Tournament,
    previousName: string,
    input: UpdateTournamentInput,
  ) {
    if (input.eventId !== undefined && input.eventId !== tournament.event.id) {
      if (input.slug !== undefined) throw sharedEventSlugError();
      await placeStage(events, tournament, await requireEvent(events, input.eventId));
      return;
    }
    const event = await requireEvent(events, tournament.event.id);
    const stageIds = (await events.stages(event.id)).map((stage) => stage.id);
    if (!ownsEvent(event, stageIds, { id: tournament.id, name: previousName })) {
      if (input.slug !== undefined && toSlug(input.slug) !== event.slug)
        throw sharedEventSlugError();
      return;
    }
    event.name = tournament.name;
    event.league = tournament.league;
    if (input.slug !== undefined)
      event.slug = await explicitEventSlug(events, input.slug, event.id);
    await events.save(event);
    tournament.event = toEventRef(event);
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
      if (!p.team || desired.has(p.team.id)) continue;
      assertParticipantRemovable(await writer.participantReferences(tournament.id, p.id));
      await writer.removeParticipant(p.id);
    }
    const present = new Set(existing.flatMap((p) => (p.team ? [p.team.id] : [])));
    for (const teamId of teamIds) {
      if (!present.has(teamId))
        await writer.saveParticipant({
          id: crypto.randomUUID(),
          tournamentId: tournament.id,
          teamId,
          playerIds: await this.activeRoster(writer, teamId),
        });
    }
  }
  private async syncPlayerParticipants(
    writer: TournamentWriter,
    tournament: Tournament,
    groups: string[][],
  ) {
    const playerIds = [...new Set(groups.flat())];
    if (playerIds.length && !(await writer.playersExist(playerIds)))
      throw new InvalidInputError(
        "One or more players were not found. Refresh the player list and try again.",
      );
    const existing = (await writer.participants(tournament.id)).filter((p) => !p.team),
      keyOf = (p: TournamentParticipant) => playerGroupKey(p.players.map((player) => player.id)),
      desired = new Set(groups.map(playerGroupKey));
    for (const p of existing) {
      if (desired.has(keyOf(p))) continue;
      assertParticipantRemovable(await writer.participantReferences(tournament.id, p.id));
      await writer.removeParticipant(p.id);
    }
    const present = new Set(existing.map(keyOf));
    for (const group of groups) {
      if (!present.has(playerGroupKey(group)))
        await writer.saveParticipant({
          id: crypto.randomUUID(),
          tournamentId: tournament.id,
          teamId: null,
          playerIds: group,
        });
    }
  }
  private async assertUpdatedLineup(
    writer: TournamentWriter,
    tournament: Tournament,
    input: UpdateTournamentInput,
  ) {
    if (input.format !== undefined) tournament.format = input.format;
    if (
      input.format === undefined &&
      input.teamIds === undefined &&
      input.playerParticipants === undefined
    )
      return;
    const current = await writer.participants(tournament.id);
    assertLineupFitsFormat(tournament.format, {
      teamIds: input.teamIds ?? current.flatMap((p) => (p.team ? [p.team.id] : [])),
      playerGroups:
        input.playerParticipants ??
        current.flatMap((p) => (p.team ? [] : [p.players.map((player) => player.id)])),
    });
  }
  /** Copied once when the team joins, so later transfers do not rewrite the tournament's history. */
  private async activeRoster(writer: TournamentWriter, teamId: string) {
    return (await writer.teamPlayers(teamId))
      .filter((player) => player.currentRole() === "active")
      .map((player) => player.id);
  }
  private async setRosters(
    writer: TournamentWriter,
    tournament: Tournament,
    rosters: ParticipantRosterInput[],
  ) {
    const playerIds = [...new Set(rosters.flatMap((roster) => roster.playerIds))];
    if (playerIds.length && !(await writer.playersExist(playerIds)))
      throw new InvalidInputError(
        "One or more players were not found. Refresh the player list and try again.",
      );
    const participants = await writer.participants(tournament.id);
    for (const roster of rosters) {
      const participant = participants.find((p) => p.team?.id === roster.teamId);
      if (!participant)
        throw new InvalidInputError(
          `Team "${roster.teamId}" is not a participant of this tournament. Add it to teamIds first.`,
        );
      await writer.saveParticipant({
        id: participant.id,
        tournamentId: tournament.id,
        teamId: roster.teamId,
        playerIds: roster.playerIds,
      });
    }
  }
}

function sharedEventSlugError() {
  return new InvalidInputError(
    "This tournament is a stage of a shared event, so it has no slug of its own. Change the slug on the event instead.",
  );
}
