import type {
  CareerPlacement,
  CareerState,
  CareerRankSnapshotEntry,
  CareerRegion,
  CareerSplitRecord,
  CareerWorldState,
} from "~/types/career";
import { DEFAULT_PLAYER_NAME, USER_ROSTER_ID } from "~/types/career";
import type { CareerWorldTeam } from "~/data/career/world";
import { WORLD_TEAMS, getWorldTeamsByRegion } from "~/data/career/world";
import { computeCircuitPoints } from "~/utils/career/points";
import { getRosterStrength } from "~/utils/career/roster";

interface RankedRosterPlayer {
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

interface PlayerCircuitInput {
  name: string;
  teamId: string | null;
  rating: number;
  region: CareerRegion | null;
  season: number;
  splits: CareerSplitRecord[];
  worlds: CareerPlacement | null;
  previousPoints: number | null;
}

export const snapshotWorldRanking = (rankings: WorldRankings): CareerRankSnapshotEntry[] =>
  rankings.teams.map((entry) => ({ points: entry.points, teamId: entry.team.id }));

const rosterPlayerFromId = (
  playerId: string,
  world: CareerWorldState,
  player: PlayerCircuitInput,
): RankedRosterPlayer => {
  if (playerId === USER_ROSTER_ID) {
    return { id: playerId, isUser: true, name: player.name, rating: player.rating };
  }

  const npc = world.players[playerId];

  return {
    id: playerId,
    isUser: false,
    name: npc?.name ?? playerId,
    rating: npc?.rating ?? 50,
  };
};

const storedSplitPoints = (
  world: CareerWorldState,
  season: number,
  split: number,
): Record<string, number> | null => {
  const field = world.splitFields.find((entry) => entry.season === season && entry.split === split);

  return field?.points ?? null;
};

/** Rankings read path must not simulate — aggregate splitFields only. */
const npcSplitPointsByTeam = (
  player: PlayerCircuitInput,
  world: CareerWorldState,
  split: number,
): Map<string, number> => {
  const stored = storedSplitPoints(world, player.season, split);

  if (stored) {
    return new Map(Object.entries(stored));
  }

  return new Map();
};

const computeWorldRankings = (
  player: PlayerCircuitInput,
  world: CareerWorldState,
): WorldRankings => {
  const completedSplits = player.splits.length;

  const freezeToSnapshot = completedSplits === 0 && (world.rankSnapshot?.length ?? 0) > 0;

  const snapshot = freezeToSnapshot ? world.rankSnapshot : null;

  const snapshotPoints = world.rankSnapshot
    ? new Map(world.rankSnapshot.map((entry) => [entry.teamId, entry.points]))
    : null;

  const snapshotOrder = snapshot
    ? new Map(snapshot.map((entry, index) => [entry.teamId, index]))
    : null;

  const npcSplitCaches: Map<string, number>[] = [];

  for (let split = 1; split <= completedSplits; split += 1) {
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

    let previous = 0;

    if (snapshotPoints) {
      previous = snapshotPoints.get(team.id) ?? 0;
    } else if (isPlayerTeam) {
      previous = player.previousPoints ?? 0;
    }

    let rankingScore = points;

    if (freezeToSnapshot) {
      rankingScore = previous;
    } else if (completedSplits === 0) {
      rankingScore = strength;
    }

    return { isPlayerTeam, points, rank: 0, rating: rankingScore, roster, strength, team };
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

  for (const [index, entry] of teams.entries()) {
    entry.rank = index + 1;
  }

  const players: RankedPlayer[] = [];

  for (const entry of teams) {
    for (const member of entry.roster) {
      players.push({
        isUser: member.isUser,
        name: member.name,
        rank: 0,
        rating: member.rating,
        region: entry.team.region,
        teamId: entry.team.id,
        teamName: entry.team.name,
      });
    }
  }

  players.sort((a, b) => b.rating - a.rating);

  for (const [index, entry] of players.entries()) {
    entry.rank = index + 1;
  }

  return { players, teams };
};

export const getTeamRank = (rankings: WorldRankings, teamId: string): number | null =>
  rankings.teams.find((entry) => entry.team.id === teamId)?.rank ?? null;

export const pickStartingTeam = (region: CareerRegion): string => {
  const teams = getWorldTeamsByRegion(region);
  const [weakest] = teams.toSorted((a, b) => a.baseStrength - b.baseStrength);

  if (!weakest) {
    throw new Error(`No team in region ${region}`);
  }

  return weakest.id;
};

export const computeStateRankings = (state: CareerState): WorldRankings =>
  computeWorldRankings(
    {
      name: state.playerName || DEFAULT_PLAYER_NAME,
      previousPoints: state.seasonRecords.at(-1)?.points ?? null,
      rating: state.stats.rating,
      region: state.region,
      season: state.currentSeason,
      splits: state.currentSplits,
      teamId: state.currentTeamId || null,
      worlds: state.currentWorlds,
    },
    state.world,
  );
