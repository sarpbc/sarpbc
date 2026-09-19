import type {
  CareerPlacement,
  CareerRankSnapshotEntry,
  CareerRegion,
  CareerSplitRecord,
  CareerWorldState,
} from "~/types/career";
import { USER_ROSTER_ID } from "~/types/career";
import type { CareerWorldTeam } from "~/data/career/world";
import { WORLD_TEAMS, getWorldTeamsByRegion } from "~/data/career/world";
import { computeCircuitPoints } from "~/utils/career/points";
import { getRosterStrength } from "~/utils/career/roster";

export interface RankedRosterPlayer {
  id: string;
  name: string;
  rating: number;
  isUser: boolean;
}

export interface RankedTeam {
  team: CareerWorldTeam;
  roster: RankedRosterPlayer[];
  strength: number;
  rating: number;
  points: number;
  rank: number;
  isPlayerTeam: boolean;
}

export interface RankedPlayer {
  name: string;
  teamId: string;
  teamName: string;
  region: CareerRegion;
  rating: number;
  rank: number;
  isUser: boolean;
}

export interface WorldRankings {
  teams: RankedTeam[];
  players: RankedPlayer[];
}

export interface PlayerCircuitInput {
  name: string;
  teamId: string | null;
  rating: number;
  region: CareerRegion | null;
  season: number;
  splits: CareerSplitRecord[];
  worlds: CareerPlacement | null;
  previousPoints: number | null;
}

export function snapshotWorldRanking(rankings: WorldRankings): CareerRankSnapshotEntry[] {
  return rankings.teams.map((entry) => ({ teamId: entry.team.id, points: entry.points }));
}

function rosterPlayerFromId(
  playerId: string,
  world: CareerWorldState,
  player: PlayerCircuitInput,
): RankedRosterPlayer {
  if (playerId === USER_ROSTER_ID) {
    return { id: playerId, name: player.name, rating: player.rating, isUser: true };
  }
  const npc = world.players[playerId];
  return {
    id: playerId,
    name: npc?.name ?? playerId,
    rating: npc?.rating ?? 50,
    isUser: false,
  };
}

function storedSplitPoints(
  world: CareerWorldState,
  season: number,
  split: number,
): Record<string, number> | null {
  const field = world.splitFields.find((entry) => entry.season === season && entry.split === split);
  return field?.points ?? null;
}

/** Rankings read path must not simulate — aggregate splitFields only. */
function npcSplitPointsByTeam(
  player: PlayerCircuitInput,
  world: CareerWorldState,
  split: number,
): Map<string, number> {
  const stored = storedSplitPoints(world, player.season, split);
  if (stored) return new Map(Object.entries(stored));
  return new Map();
}

export function computeWorldRankings(
  _careerId: string,
  player: PlayerCircuitInput,
  world: CareerWorldState,
): WorldRankings {
  const completedSplits = player.splits.length;
  const freezeToSnapshot =
    completedSplits === 0 && world.rankSnapshot != null && world.rankSnapshot.length > 0;
  const snapshot = freezeToSnapshot ? world.rankSnapshot : null;
  const snapshotPoints = world.rankSnapshot
    ? new Map(world.rankSnapshot.map((entry) => [entry.teamId, entry.points]))
    : null;
  const snapshotOrder = snapshot
    ? new Map(snapshot.map((entry, index) => [entry.teamId, index]))
    : null;

  const npcSplitCaches: Map<string, number>[] = [];
  for (let split = 1; split <= completedSplits; split++) {
    npcSplitCaches.push(npcSplitPointsByTeam(player, world, split));
  }

  const yearPlayerPoints = computeCircuitPoints(player.splits);

  const teams: RankedTeam[] = WORLD_TEAMS.map((team) => {
    const isPlayerTeam = team.id === player.teamId;
    const rosterIds = world.rosters[team.id] ?? [...team.players];
    const roster = rosterIds.map((id) => rosterPlayerFromId(id, world, player));
    const strength =
      roster.length > 0 ? getRosterStrength(rosterIds, world, player.rating) : team.baseStrength;
    const splitPoints = isPlayerTeam
      ? player.splits.map((record) => record.points)
      : npcSplitCaches.map((cache) => cache.get(team.id) ?? 0);
    const points = isPlayerTeam
      ? yearPlayerPoints
      : splitPoints.reduce((sum, value) => sum + value, 0);
    const previous = snapshotPoints
      ? (snapshotPoints.get(team.id) ?? 0)
      : isPlayerTeam
        ? (player.previousPoints ?? 0)
        : 0;
    const rankingScore = freezeToSnapshot ? previous : completedSplits === 0 ? strength : points;
    return { team, roster, strength, rating: rankingScore, points, rank: 0, isPlayerTeam };
  });
  if (snapshotOrder) {
    teams.sort(
      (a, b) => (snapshotOrder.get(a.team.id) ?? 999) - (snapshotOrder.get(b.team.id) ?? 999),
    );
  } else {
    teams.sort(
      (a, b) =>
        b.rating - a.rating || b.strength - a.strength || a.team.id.localeCompare(b.team.id),
    );
  }
  teams.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  const players: RankedPlayer[] = [];
  for (const entry of teams) {
    for (const member of entry.roster) {
      players.push({
        name: member.name,
        teamId: entry.team.id,
        teamName: entry.team.name,
        region: entry.team.region,
        rating: member.rating,
        rank: 0,
        isUser: member.isUser,
      });
    }
  }
  players.sort((a, b) => b.rating - a.rating);
  players.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return { teams, players };
}

export function getTeamRank(rankings: WorldRankings, teamId: string): number | null {
  return rankings.teams.find((entry) => entry.team.id === teamId)?.rank ?? null;
}

export function pickStartingTeam(region: CareerRegion): string {
  const teams = getWorldTeamsByRegion(region);
  const weakest = [...teams].sort((a, b) => a.baseStrength - b.baseStrength)[0];
  return weakest!.id;
}
