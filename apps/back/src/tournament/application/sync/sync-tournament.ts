import { v4 } from "uuid";
import { mapSequentially } from "../../../common/application/sequentially";
import { allocateSlug, eventSlug } from "@sarpbc/utils";
import { Team } from "../../../roster/domain/team";
import { ConflictError } from "../../../common/domain/errors/conflict-error";
import { NotFoundError } from "../../../common/domain/errors/not-found-error";
import { League } from "../../domain/league";
import { counterpartSearchWindow, findManualCounterpart } from "../../domain/manual-counterpart";
import { Tournament } from "../../domain/tournament";
import { inferEndAt } from "../../domain/tournament-end";
import { TournamentEvent, eventDisplayName, toEventRef } from "../../domain/tournament-event";
import { assertPandascoreUpsertAllowed, claimForPandascore } from "../../domain/tournament-source";
import { placeStage } from "../event-placement";
import type { UpsertTournamentCommand } from "../feed";
import type { CompetitionDiagnostics, CompetitionWriteScope, EventWriter } from "../ports";
import type { AppliedTournament } from "./sync-applied";
import { applyLeague } from "./sync-catalog";

async function manualCounterpart(
  scope: CompetitionWriteScope,
  diagnostics: CompetitionDiagnostics,
  command: UpsertTournamentCommand,
  league: League | null,
): Promise<string | null> {
  const eventName = eventDisplayName({
    leagueName: league?.name ?? null,
    serieName: command.serie?.fullName ?? null,
    stageName: command.name,
  });

  const stage = {
    eventName,
    stageName: command.name,
    leagueId: league?.id ?? null,
    beginAt: command.beginAt ?? null,
    endAt: command.endAt ?? null,
  };

  const window = counterpartSearchWindow(stage);

  if (!window) {
    return null;
  }

  const candidates = await scope.tournaments.manualCandidates(window);
  const match = findManualCounterpart(stage, candidates);

  switch (match.kind) {
    case "none": {
      return null;
    }

    case "unique": {
      return match.id;
    }

    case "ambiguous": {
      diagnostics.warn("Several manual tournaments match a PandaScore stage; none linked", {
        pandascoreId: command.pandascoreId,
        tournamentIds: match.ids,
      });

      return null;
    }

    default: {
      const neverMatch: never = match;

      return neverMatch;
    }
  }
}

async function syncTarget(
  scope: CompetitionWriteScope,
  diagnostics: CompetitionDiagnostics,
  command: UpsertTournamentCommand,
  league: League | null,
  linkTournamentId: string | undefined,
): Promise<Tournament | null> {
  const synced = await scope.tournaments.byPandascoreId(command.pandascoreId);

  if (synced) {
    if (
      linkTournamentId !== undefined &&
      linkTournamentId !== "" &&
      synced.id !== linkTournamentId
    ) {
      throw new ConflictError(
        `PandaScore tournament ${command.pandascoreId} is already imported as tournament ${synced.id}.`,
      );
    }

    return synced;
  }

  const manualId =
    linkTournamentId ?? (await manualCounterpart(scope, diagnostics, command, league));

  if (manualId === null || manualId === "") {
    return null;
  }

  const manual = await scope.tournaments.load(manualId);

  if (!manual) {
    throw new NotFoundError(`Tournament with id "${manualId}" was not found.`);
  }

  claimForPandascore(manual, command.pandascoreId, command.endAt ?? null);

  return manual;
}

export async function settleEndAt(
  scope: CompetitionWriteScope,
  tournament: Tournament,
): Promise<void> {
  if (tournament.endAt || tournament.endAtCorrected) {
    return;
  }

  const timings = await scope.matches.timings(tournament.id);
  const endAt = inferEndAt(timings);

  if (!endAt) {
    return;
  }

  tournament.endAt = endAt;
  await scope.tournaments.save(tournament);
}

async function findExistingEvent(
  events: EventWriter,
  command: UpsertTournamentCommand,
  currentEventId: string | null,
  league: League | null,
  name: string,
): Promise<TournamentEvent | null> {
  const { serie } = command;

  const current =
    currentEventId !== null && currentEventId !== "" ? await events.load(currentEventId) : null;

  const unclaimedCurrent = current?.pandascoreSerieId === null ? current : null;

  if (!serie) {
    return unclaimedCurrent;
  }

  return (
    (await events.bySerieId(serie.pandascoreId)) ??
    unclaimedCurrent ??
    (await events.unclaimedByName(league?.id ?? null, name))
  );
}

/** Backfilled events claim their serie on first sync instead of duplicating under a `-2` slug. */
async function resolveEvent(
  events: EventWriter,
  currentEventId: string | null,
  command: UpsertTournamentCommand,
  league: League | null,
): Promise<{ event: TournamentEvent; renamed: boolean }> {
  const { serie } = command;

  const name = eventDisplayName({
    leagueName: league?.name ?? null,
    serieName: serie?.fullName ?? null,
    stageName: command.name,
  });

  const found = await findExistingEvent(events, command, currentEventId, league, name);
  const event = found ?? new TournamentEvent();

  if (!found) {
    const year = serie?.year ?? command.beginAt?.getUTCFullYear() ?? null;
    event.slug = await allocateSlug(
      eventSlug(name, year),
      async (slug) => await events.slugTaken(slug, null),
    );
  }

  const renamed = found !== null && found.name !== name;
  event.pandascoreSerieId = serie?.pandascoreId ?? event.pandascoreSerieId;
  event.name = name;
  event.league = league;
  await events.save(event);

  return { event, renamed };
}

function copyTournamentFields(
  tournament: Tournament,
  command: UpsertTournamentCommand,
  league: League | null,
): void {
  tournament.source = "pandascore";
  tournament.name = command.name;
  tournament.tier = command.tier ?? null;
  tournament.beginAt = command.beginAt ?? null;

  if (!tournament.endAtCorrected) {
    tournament.endAt = command.endAt ?? null;
  }

  tournament.prizepool = command.prizepool ?? null;
  tournament.type = command.type ?? null;
  tournament.country = command.country ?? null;
  tournament.hasBracket = command.hasBracket ?? false;
  tournament.winnerType = command.winnerType ?? null;
  tournament.league = league;
}

async function dropEmptyPreviousEvent(
  events: EventWriter,
  previousEventId: string,
  event: TournamentEvent,
): Promise<void> {
  const remaining = await events.stages(previousEventId);

  if (remaining.length) {
    return;
  }

  const previous = await events.load(previousEventId);

  if (previous && event.streams.length === 0 && previous.streams.length > 0) {
    event.streams = previous.streams;
    await events.save(event);
  }

  await events.remove(previousEventId);
}

async function importExpectedRoster(
  scope: CompetitionWriteScope,
  tournament: Tournament,
  command: UpsertTournamentCommand,
): Promise<void> {
  const participants = await scope.tournaments.participants(tournament.id);

  const pandascoreTeams = new Map(
    participants.flatMap((participant) =>
      participant.team?.pandascoreId !== null &&
      participant.team?.pandascoreId !== undefined &&
      participant.team.pandascoreId !== 0
        ? [[participant.id, participant.team.pandascoreId]]
        : [],
    ),
  );

  // Rosters are written in provider order: team and player upserts share unique slugs and ids.
  await mapSequentially(command.expectedRoster ?? [], async (roster) => {
    const team = await scope.rosters.upsertTeam(roster.team);
    const existingParticipant = participants.find((p) => p.team?.id === team.id);

    const imported = await mapSequentially(
      roster.players,
      async (player) => await scope.rosters.upsertPlayer(player),
    );

    const playerIds = imported.map((player) => player.id);

    const participantId = existingParticipant?.id ?? v4();

    if (roster.team.pandascoreId !== undefined && roster.team.pandascoreId !== 0) {
      pandascoreTeams.set(participantId, roster.team.pandascoreId);
    }

    await scope.tournaments.saveParticipant({
      id: participantId,
      tournamentId: tournament.id,
      teamId: team.id,
      playerIds,
      rosterSourceUrl: existingParticipant?.rosterSourceUrl ?? null,
    });

    if (roster.team.pandascoreId === command.winnerPandascoreTeamId) {
      // Winner identity is sufficient for persistence; full roster views are reloaded after commit.
      tournament.winner = {
        id: participantId,
        tournamentId: tournament.id,
        team:
          existingParticipant?.team ?? Object.assign(new Team(), { ...roster.team, id: team.id }),
        players: [],
        rosterSourceUrl: existingParticipant?.rosterSourceUrl ?? null,
        createdAt: existingParticipant?.createdAt ?? new Date(),
        updatedAt: new Date(),
      };
    }
  });

  if (command.standings) {
    const ranks = new Map(command.standings.map((s) => [s.teamPandascoreId, s.rank]));
    await scope.tournaments.setPlacements(
      new Map([...pandascoreTeams].map(([id, teamId]) => [id, ranks.get(teamId) ?? null])),
    );
  }
}

export async function applyTournament(
  scope: CompetitionWriteScope,
  diagnostics: CompetitionDiagnostics,
  command: UpsertTournamentCommand,
  linkTournamentId?: string,
): Promise<AppliedTournament> {
  const league = command.league ? await applyLeague(scope, command.league) : null;
  const existing = await syncTarget(scope, diagnostics, command, league, linkTournamentId);

  if (existing) {
    assertPandascoreUpsertAllowed(existing, command.pandascoreId);
  }

  const tournament =
    existing ?? Object.assign(new Tournament(), { pandascoreId: command.pandascoreId });

  copyTournamentFields(tournament, command, league);
  const previousEventId = existing?.event.id ?? null;
  const { event, renamed } = await resolveEvent(scope.events, previousEventId, command, league);

  if (event.id === previousEventId) {
    tournament.event = toEventRef(event);
  } else {
    await placeStage(scope.events, tournament, event);
  }

  await scope.tournaments.save(tournament);

  if (previousEventId !== null && previousEventId !== "" && previousEventId !== event.id) {
    await dropEmptyPreviousEvent(scope.events, previousEventId, event);
  }

  await importExpectedRoster(scope, tournament, command);
  await scope.tournaments.save(tournament);
  const siblings = renamed ? await scope.events.stages(event.id) : [];

  return {
    tournament,
    stageIds: [...new Set([tournament.id, ...siblings.map((stage) => stage.id)])],
  };
}
