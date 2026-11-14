import type { MatchLineup, MatchLineupInput, MatchLineupPlayer } from "@sarpbc/types";
import { MAX_LINEUP_PLAYERS } from "@sarpbc/utils";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";

export interface LineupSide {
  participantId: string;
  rosterIds: readonly string[];
}

export interface LineupRow {
  participantId: string;
  player: Omit<MatchLineupPlayer, "standIn">;
}

export function isStandIn(rosterIds: readonly string[], playerId: string): boolean {
  return !rosterIds.includes(playerId);
}

export function normalizeLineups(
  participantIds: readonly string[],
  inputs: readonly MatchLineupInput[],
): MatchLineupInput[] {
  const byParticipant = new Map<string, string[]>();
  const players = new Set<string>();

  for (const { participantId, playerIds } of inputs) {
    if (!participantIds.includes(participantId))
      throw new InvalidInputError(`Participant "${participantId}" does not play this match`);

    if (byParticipant.has(participantId))
      throw new InvalidInputError(`Participant "${participantId}" has two lineups`);

    if (playerIds.length > MAX_LINEUP_PLAYERS)
      throw new InvalidInputError(`A lineup has at most ${MAX_LINEUP_PLAYERS} players`);

    for (const playerId of playerIds) {
      if (players.has(playerId))
        throw new InvalidInputError(`Player "${playerId}" appears twice in the match lineups`);
      players.add(playerId);
    }

    byParticipant.set(participantId, [...playerIds]);
  }

  return participantIds.flatMap((participantId) => {
    const playerIds = byParticipant.get(participantId) ?? [];

    return playerIds.length > 0 ? [{ participantId, playerIds }] : [];
  });
}

export function buildLineups(
  sides: readonly LineupSide[],
  rows: readonly LineupRow[],
): MatchLineup[] {
  return sides.flatMap(({ participantId, rosterIds }) => {
    const players = rows.flatMap((row) =>
      row.participantId === participantId
        ? [{ ...row.player, standIn: isStandIn(rosterIds, row.player.id) }]
        : [],
    );

    return players.length > 0 ? [{ participantId, players }] : [];
  });
}

export interface GameLineupSource {
  teams: readonly {
    participantId: string;
    players: readonly { player: { id: string } | null }[];
  }[];
}

export function lineupsFromGames(games: readonly GameLineupSource[]): MatchLineupInput[] {
  const byParticipant = new Map<string, string[]>();
  const seen = new Set<string>();

  for (const { teams } of games) {
    for (const { participantId, players } of teams) {
      const playerIds = byParticipant.get(participantId) ?? [];

      for (const { player } of players) {
        if (!player || seen.has(player.id)) continue;
        seen.add(player.id);
        playerIds.push(player.id);
      }

      byParticipant.set(participantId, playerIds);
    }
  }

  return [...byParticipant].flatMap(([participantId, playerIds]) =>
    playerIds.length > 0
      ? [{ participantId, playerIds: playerIds.slice(0, MAX_LINEUP_PLAYERS) }]
      : [],
  );
}
