import { mapSequentially } from "../../common/application/sequentially";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { parseDataSourceUrl } from "../../common/domain/data-source";
import type { Tournament } from "../domain/tournament";
import { assertLineupFitsFormat, playerGroupKey } from "../domain/tournament-format";
import { assertParticipantRemovable } from "../domain/tournament-participant";
import type { TournamentParticipant } from "../domain/tournament-participant";
import type { ParticipantRosterInput, UpdateTournamentInput } from "./inputs";
import type { TournamentWriter } from "./ports";

function playersNotFound(): InvalidInputError {
  return new InvalidInputError(
    "One or more players were not found. Refresh the player list and try again.",
  );
}

function participantPlayerKey(participant: TournamentParticipant): string {
  return playerGroupKey(participant.players.map((player) => player.id));
}

/** Copied once when the team joins, so later transfers do not rewrite the history of the tournament. */
async function activeRoster(writer: TournamentWriter, teamId: string): Promise<string[]> {
  const players = await writer.teamPlayers(teamId);

  return players.filter((player) => player.currentRole() === "active").map((player) => player.id);
}

async function removeParticipants(
  writer: TournamentWriter,
  tournamentId: string,
  participants: TournamentParticipant[],
): Promise<void> {
  const references = await mapSequentially(
    participants,
    async (p) => await writer.participantReferences(tournamentId, p.id),
  );

  for (const reference of references) {
    assertParticipantRemovable(reference);
  }

  await mapSequentially(participants, async (p) => {
    await writer.removeParticipant(p.id);
  });
}

export async function syncParticipants(
  writer: TournamentWriter,
  tournament: Tournament,
  teamIds: string[],
): Promise<void> {
  if (new Set(teamIds).size !== teamIds.length || !(await writer.teamsExist(teamIds))) {
    throw new InvalidInputError(
      "One or more teams were not found. Refresh the team list and try again.",
    );
  }

  const existing = await writer.participants(tournament.id);
  const desired = new Set(teamIds);

  await removeParticipants(
    writer,
    tournament.id,
    existing.filter((p) => p.team !== null && !desired.has(p.team.id)),
  );

  const present = new Set(existing.flatMap((p) => (p.team ? [p.team.id] : [])));

  const missing = teamIds.filter((teamId) => !present.has(teamId));

  await mapSequentially(missing, async (teamId) => {
    await writer.saveParticipant({
      id: crypto.randomUUID(),
      tournamentId: tournament.id,
      teamId,
      playerIds: await activeRoster(writer, teamId),
      rosterSourceUrl: null,
    });
  });
}

export async function syncPlayerParticipants(
  writer: TournamentWriter,
  tournament: Tournament,
  groups: string[][],
): Promise<void> {
  const playerIds = [...new Set(groups.flat())];

  if (playerIds.length && !(await writer.playersExist(playerIds))) {
    throw playersNotFound();
  }

  const participants = await writer.participants(tournament.id);
  const existing = participants.filter((p) => !p.team);
  const desired = new Set(groups.map(playerGroupKey));

  await removeParticipants(
    writer,
    tournament.id,
    existing.filter((p) => !desired.has(participantPlayerKey(p))),
  );

  const present = new Set(existing.map(participantPlayerKey));

  const missing = groups.filter((group) => !present.has(playerGroupKey(group)));

  await mapSequentially(missing, async (group) => {
    await writer.saveParticipant({
      id: crypto.randomUUID(),
      tournamentId: tournament.id,
      teamId: null,
      playerIds: group,
      rosterSourceUrl: null,
    });
  });
}

export async function assertUpdatedLineup(
  writer: TournamentWriter,
  tournament: Tournament,
  input: UpdateTournamentInput,
): Promise<void> {
  if (input.format !== undefined) {
    tournament.format = input.format;
  }

  if (
    input.format === undefined &&
    input.teamIds === undefined &&
    input.playerParticipants === undefined
  ) {
    return;
  }

  const current = await writer.participants(tournament.id);
  assertLineupFitsFormat(tournament.format, {
    teamIds: input.teamIds ?? current.flatMap((p) => (p.team ? [p.team.id] : [])),
    playerGroups:
      input.playerParticipants ??
      current.flatMap((p) => (p.team ? [] : [p.players.map((player) => player.id)])),
  });
}

export async function setRosters(
  writer: TournamentWriter,
  tournament: Tournament,
  rosters: ParticipantRosterInput[],
): Promise<void> {
  const playerIds = [...new Set(rosters.flatMap((roster) => roster.playerIds))];

  if (playerIds.length && !(await writer.playersExist(playerIds))) {
    throw playersNotFound();
  }

  const participants = await writer.participants(tournament.id);

  // A team listed twice keeps its last roster, as when the rosters were saved one after another.
  const latestByParticipant = new Map<
    string,
    { participant: TournamentParticipant; roster: ParticipantRosterInput }
  >();

  for (const roster of rosters) {
    const participant = participants.find((p) => p.team?.id === roster.teamId);

    if (!participant) {
      throw new InvalidInputError(
        `Team "${roster.teamId}" is not a participant of this tournament. Add it to teamIds first.`,
      );
    }

    latestByParticipant.set(participant.id, { participant, roster });
  }

  await mapSequentially([...latestByParticipant.values()], async ({ participant, roster }) => {
    await writer.saveParticipant({
      id: participant.id,
      tournamentId: tournament.id,
      teamId: roster.teamId,
      playerIds: roster.playerIds,
      rosterSourceUrl:
        roster.sourceUrl === undefined
          ? participant.rosterSourceUrl
          : parseDataSourceUrl(roster.sourceUrl),
    });
  });
}
