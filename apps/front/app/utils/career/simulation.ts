import type {
  CareerPlacement,
  CareerRegion,
  CareerRole,
  CareerSeasonRecord,
  CareerSplitRecord,
  CareerStats,
  CareerTrophy,
  CareerWorldState,
} from "~/types/career";
import {
  MAJOR_QUALIFICATION_POINTS,
  REGIONALS_PER_SPLIT,
  SPLITS_PER_SEASON,
  USER_ROSTER_ID,
  WORLDS_QUALIFICATION_POINTS,
  getSeasonsPastPeak,
} from "~/types/career";
import type { CareerWorldTeam } from "~/data/career/world";
import { WORLD_TEAMS, getWorldTeamsByRegion } from "~/data/career/world";
import { createRng, hashString } from "~/utils/career/rng";
import { getRosterStrength } from "~/utils/career/roster";
import { computeComposite } from "~/utils/career/stats";

export { createRng, hashString } from "~/utils/career/rng";

export const REGIONAL_POINTS: Record<CareerPlacement, number> = {
  winner: 10,
  finalist: 7,
  top4: 5,
  top8: 3,
  group: 1,
};

export const MAJOR_POINTS: Record<CareerPlacement, number> = {
  winner: 20,
  finalist: 14,
  top4: 10,
  top8: 6,
  group: 3,
};

export const WORLDS_POINTS: Record<CareerPlacement, number> = {
  winner: 30,
  finalist: 22,
  top4: 16,
  top8: 10,
  group: 5,
};

function placementFromScore(score: number): CareerPlacement {
  if (score >= 80) return "winner";
  if (score >= 71) return "finalist";
  if (score >= 61) return "top4";
  if (score >= 50) return "top8";
  return "group";
}

export interface SplitSimulation {
  regionals: CareerPlacement[];
  major: CareerPlacement | null;
  points: number;
}

function blendWithTeam(personal: number, teamStrength: number | undefined): number {
  if (teamStrength == null) return personal;
  return personal * 0.55 + teamStrength * 0.45;
}

/** Simulate one split: three regionals, then the major if enough points were earned. */
export function simulateSplit(
  stats: CareerStats,
  role: CareerRole,
  seed: number,
  teamStrength?: number,
): SplitSimulation {
  const rng = createRng(seed);
  const composite = blendWithTeam(computeComposite(stats, role), teamStrength);

  const regionals: CareerPlacement[] = [];
  let regionalPoints = 0;
  for (let i = 0; i < REGIONALS_PER_SPLIT; i++) {
    const placement = placementFromScore(composite * 0.75 + rng() * 30);
    regionals.push(placement);
    regionalPoints += REGIONAL_POINTS[placement];
  }

  let major: CareerPlacement | null = null;
  let points = regionalPoints;
  if (regionalPoints >= MAJOR_QUALIFICATION_POINTS) {
    major = placementFromScore(composite * 0.75 + rng() * 30 - 5);
    points += MAJOR_POINTS[major];
  }

  return { regionals, major, points };
}

/** Simulate the Worlds run — the strongest field of the season. */
export function simulateWorlds(
  stats: CareerStats,
  role: CareerRole,
  seed: number,
  teamStrength?: number,
): CareerPlacement {
  const rng = createRng(seed);
  const composite = blendWithTeam(computeComposite(stats, role), teamStrength);
  return placementFromScore(composite * 0.75 + rng() * 30 - 10);
}

/** Stat drift applied after a split based on how the run went. */
export function getSplitFeedback(sim: SplitSimulation): Partial<CareerStats> {
  if (sim.major === "winner") return { rating: 2, morale: 4 };
  if (sim.major === "finalist" || sim.major === "top4") return { rating: 1, morale: 2 };
  if (sim.major !== null) return { form: 1 };
  return { morale: -3 };
}

export function getWorldsFeedback(placement: CareerPlacement): Partial<CareerStats> {
  switch (placement) {
    case "winner":
      return { rating: 3, morale: 5 };
    case "finalist":
      return { rating: 2, morale: 3 };
    case "top4":
      return { rating: 1, morale: 2 };
    case "top8":
      return { morale: 1 };
    case "group":
      return { morale: -2 };
    default: {
      const _exhaustive: never = placement;
      return _exhaustive;
    }
  }
}

export function computeCircuitPoints(
  splits: CareerSplitRecord[],
  worlds: CareerPlacement | null,
): number {
  return computeSeasonPoints(splits) + (worlds ? WORLDS_POINTS[worlds] : 0);
}

function expectedNpcFullSeasonPoints(baseStrength: number, seed: number): number {
  const rng = createRng(seed);
  const t = Math.max(0, Math.min(1, (baseStrength - 55) / 40));
  const expected = 22 + t ** 1.15 * 72;
  const form = 0.7 + rng() * 0.45;
  return Math.max(6, Math.round(expected * form));
}

/** Simulated circuit points for an NPC team for one season, truncated to how far the player has played. */
export function simulateNpcCircuitPoints(
  careerId: string,
  season: number,
  teamId: string,
  strength: number,
  completedSplits: number,
  worldsDone: boolean,
): number {
  const full = expectedNpcFullSeasonPoints(
    strength,
    hashString(`${careerId}:${season}:${teamId}:circuit`),
  );
  if (completedSplits <= 0 && !worldsDone) return 0;
  if (completedSplits === 1 && !worldsDone) {
    const pace = 0.28 + createRng(hashString(`${careerId}:${season}:${teamId}:pace`))() * 0.42;
    return Math.round(full * pace);
  }
  if (completedSplits >= 2 && !worldsDone) return Math.round(full * 0.82);
  return full;
}

export interface RankedRosterPlayer {
  id: string;
  name: string;
  rating: number;
  isUser: boolean;
}

export interface RankedTeam {
  team: CareerWorldTeam;
  roster: RankedRosterPlayer[];
  /** Average of the current 3 roster ratings. */
  strength: number;
  /** Last completed season's circuit points — the world-ranking seed. */
  rating: number;
  /** Circuit points earned this season. */
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

function isCurrentSeasonComplete(player: PlayerCircuitInput): boolean {
  if (player.worlds !== null) return true;
  if (player.splits.length < SPLITS_PER_SEASON) return false;
  return computeSeasonPoints(player.splits) < WORLDS_QUALIFICATION_POINTS;
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

export function computeWorldRankings(
  careerId: string,
  player: PlayerCircuitInput,
  world: CareerWorldState,
): WorldRankings {
  const completedSplits = player.splits.length;
  const worldsDone = player.worlds !== null;
  const seasonComplete = isCurrentSeasonComplete(player);
  const rankingSeason = seasonComplete ? player.season : Math.max(0, player.season - 1);
  const npcSplitsForRank = seasonComplete ? completedSplits : SPLITS_PER_SEASON;
  const npcWorldsForRank = seasonComplete ? worldsDone : true;

  const yearPlayerPoints = computeCircuitPoints(player.splits, player.worlds);
  const rankingPlayerPoints = seasonComplete ? yearPlayerPoints : (player.previousPoints ?? 0);

  const teams: RankedTeam[] = WORLD_TEAMS.map((team) => {
    const isPlayerTeam = team.id === player.teamId;
    const rosterIds = world.rosters[team.id] ?? [...team.players];
    const roster = rosterIds.map((id) => rosterPlayerFromId(id, world, player));
    const strength =
      roster.length > 0 ? getRosterStrength(rosterIds, world, player.rating) : team.baseStrength;
    const rankingPoints = isPlayerTeam
      ? rankingPlayerPoints
      : simulateNpcCircuitPoints(
          careerId,
          rankingSeason,
          team.id,
          strength,
          npcSplitsForRank,
          npcWorldsForRank,
        );
    const points = isPlayerTeam
      ? yearPlayerPoints
      : simulateNpcCircuitPoints(
          careerId,
          player.season,
          team.id,
          strength,
          completedSplits,
          worldsDone,
        );
    return { team, roster, strength, rating: rankingPoints, points, rank: 0, isPlayerTeam };
  }).sort((a, b) => b.rating - a.rating || b.strength - a.strength);
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

/** Rookies start on the weakest team of their region. */
export function pickStartingTeam(region: CareerRegion): string {
  const teams = getWorldTeamsByRegion(region);
  const weakest = [...teams].sort((a, b) => a.baseStrength - b.baseStrength)[0];
  return weakest!.id;
}

/**
 * Offseason interest: better seasons draw more, and better, teams.
 * A weak year never attracts a top-4 side.
 */
export function getTransferBand(
  seasonPoints: number,
  currentRank: number,
): { minRank: number; maxRank: number; maxOffers: number } | null {
  if (seasonPoints < 15) return null;
  if (seasonPoints < 28) {
    return { minRank: Math.max(currentRank, 8), maxRank: 99, maxOffers: 1 };
  }
  if (seasonPoints < 42) {
    return { minRank: Math.max(5, currentRank - 1), maxRank: currentRank + 6, maxOffers: 1 };
  }
  if (seasonPoints < 60) {
    return {
      minRank: Math.max(3, currentRank - 3),
      maxRank: Math.max(currentRank + 2, 8),
      maxOffers: 2,
    };
  }
  return { minRank: 1, maxRank: Math.max(6, currentRank), maxOffers: 3 };
}

export function pickOffseasonOffers(
  currentTeamId: string,
  seasonPoints: number,
  rankings: WorldRankings,
  seed: number,
): string[] {
  const currentRank = getTeamRank(rankings, currentTeamId) ?? rankings.teams.length;
  const band = getTransferBand(seasonPoints, currentRank);
  if (!band) return [];

  const rng = createRng(seed);
  const pool = rankings.teams.filter(
    (entry) =>
      entry.team.id !== currentTeamId && entry.rank >= band.minRank && entry.rank <= band.maxRank,
  );
  if (pool.length === 0) return [];

  let count: number;
  if (seasonPoints >= 60) {
    count = rng() < 0.35 ? 3 : rng() < 0.7 ? 2 : 1;
  } else if (seasonPoints >= 42) {
    count = rng() < 0.4 ? 2 : 1;
  } else if (seasonPoints >= 28) {
    count = rng() < 0.65 ? 1 : 0;
  } else {
    count = rng() < 0.5 ? 1 : 0;
  }
  count = Math.min(count, band.maxOffers, pool.length);
  if (count <= 0) return [];

  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const current = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = current;
  }
  return shuffled.slice(0, count).map((entry) => entry.team.id);
}

function pickWeakestOtherTeam(currentTeamId: string, rankings: WorldRankings): string {
  const others = rankings.teams.filter((entry) => entry.team.id !== currentTeamId);
  const weakest = [...others].sort((a, b) => b.rank - a.rank)[0];
  return weakest!.team.id;
}

export interface OffseasonResolution {
  transferTeamIds: string[];
  renewalOffered: boolean;
  lastChanceTeamId: string | null;
}

/**
 * Peak years always renew. Transfer interest is 0–3 teams matching the season.
 * After five seasons, renewal chance falls each year until no team will sign you.
 */
export function resolveOffseasonContracts(
  seasonJustFinished: number,
  seasonPoints: number,
  currentTeamId: string,
  rankings: WorldRankings,
  seed: number,
): OffseasonResolution {
  const rng = createRng(seed);
  const pastPeak = getSeasonsPastPeak(seasonJustFinished + 1);
  const transferTeamIds = pickOffseasonOffers(currentTeamId, seasonPoints, rankings, seed);

  if (pastPeak === 0) {
    return {
      transferTeamIds,
      renewalOffered: true,
      lastChanceTeamId: null,
    };
  }

  const performance =
    seasonPoints >= 42 ? 0.15 : seasonPoints >= 20 ? 0.05 : seasonPoints < 10 ? -0.15 : 0;
  const renewalChance = Math.max(0.04, 0.72 - pastPeak * 0.14 + performance);
  const renewalOffered = rng() < renewalChance;

  let lastChanceTeamId: string | null = null;
  if (!renewalOffered && transferTeamIds.length === 0) {
    const lastChance = Math.max(0, 0.5 - pastPeak * 0.11);
    if (rng() < lastChance) {
      lastChanceTeamId = pickWeakestOtherTeam(currentTeamId, rankings);
    }
  }

  return { transferTeamIds, renewalOffered, lastChanceTeamId };
}

export function computeSeasonPoints(splits: CareerSplitRecord[]): number {
  return splits.reduce((sum, split) => sum + split.points, 0);
}

export function deriveTrophies(seasons: CareerSeasonRecord[]): CareerTrophy[] {
  const trophies: CareerTrophy[] = [];
  for (const season of seasons) {
    for (const split of season.splits) {
      for (const regional of split.regionals) {
        if (regional === "winner") trophies.push({ type: "regional", season: season.season });
      }
      if (split.major === "winner") trophies.push({ type: "major", season: season.season });
    }
    if (season.worlds === "winner") trophies.push({ type: "worlds", season: season.season });
  }
  return trophies;
}
