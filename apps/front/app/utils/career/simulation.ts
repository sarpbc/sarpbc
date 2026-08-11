import type {
  CareerPlacement,
  CareerRegion,
  CareerRole,
  CareerSeasonRecord,
  CareerSplitRecord,
  CareerStats,
  CareerTrophy,
} from "~/types/career";
import { MAJOR_QUALIFICATION_POINTS, REGIONALS_PER_SPLIT } from "~/types/career";
import type { CareerWorldTeam } from "~/data/career/world";
import { WORLD_TEAMS, getWorldTeamsByRegion } from "~/data/career/world";
import { computeComposite } from "~/utils/career/stats";

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

export function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createRng(seed: number): () => number {
  let localSeed = seed >>> 0 || 1;
  return () => {
    localSeed = (Math.imul(localSeed, 1103515245) + 12345) & 0x7fffffff;
    return localSeed / 0x7fffffff;
  };
}

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

/** Simulate one split: three regionals, then the major if enough points were earned. */
export function simulateSplit(stats: CareerStats, role: CareerRole, seed: number): SplitSimulation {
  const rng = createRng(seed);
  const composite = computeComposite(stats, role);

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
): CareerPlacement {
  const rng = createRng(seed);
  const composite = computeComposite(stats, role);
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

/**
 * Living world ratings: every completed split, each fictional team's rating
 * drifts on a seeded random walk so rankings evolve over the career.
 */
export function computeWorldTeamRatings(careerId: string, stepIndex: number): Map<string, number> {
  const ratings = new Map<string, number>();
  for (const team of WORLD_TEAMS) {
    let rating = team.baseStrength;
    for (let step = 1; step <= stepIndex; step++) {
      const rng = createRng(hashString(`${careerId}:${team.id}:${step}`));
      rating += (rng() - 0.48) * 6;
    }
    ratings.set(team.id, Math.max(40, Math.min(99, rating)));
  }
  return ratings;
}

export interface RankedTeam {
  team: CareerWorldTeam;
  rating: number;
  rank: number;
  isPlayerTeam: boolean;
}

export interface RankedPlayer {
  name: string;
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

export function computeWorldRankings(
  careerId: string,
  stepIndex: number,
  player: { name: string; teamId: string | null; rating: number; region: CareerRegion | null },
): WorldRankings {
  const ratings = computeWorldTeamRatings(careerId, stepIndex);

  const teams: RankedTeam[] = WORLD_TEAMS.map((team) => {
    const worldRating = ratings.get(team.id) ?? team.baseStrength;
    const isPlayerTeam = team.id === player.teamId;
    const rating = isPlayerTeam ? worldRating * 0.7 + player.rating * 0.3 : worldRating;
    return { team, rating, rank: 0, isPlayerTeam };
  }).sort((a, b) => b.rating - a.rating);
  teams.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  const players: RankedPlayer[] = [];
  for (const entry of teams) {
    const teamRating = entry.rating;
    entry.team.players.forEach((gamertag, slot) => {
      const rng = createRng(hashString(`${careerId}:${entry.team.id}:p${slot}`));
      players.push({
        name: gamertag,
        teamName: entry.team.name,
        region: entry.team.region,
        rating: teamRating + (rng() * 10 - 4),
        rank: 0,
        isUser: false,
      });
    });
  }
  if (player.teamId !== null && player.region !== null) {
    const playerTeam = teams.find((entry) => entry.isPlayerTeam);
    players.push({
      name: player.name,
      teamName: playerTeam?.team.name ?? "",
      region: player.region,
      rating: player.rating,
      rank: 0,
      isUser: true,
    });
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
 * Offseason offer: the better the season, the higher-ranked the interested team.
 * Returns a team id different from the current team.
 */
export function pickOffseasonOffer(
  currentTeamId: string,
  seasonPoints: number,
  rankings: WorldRankings,
  seed: number,
): string {
  const rng = createRng(seed);
  let minRank: number;
  let maxRank: number;
  if (seasonPoints >= 50) {
    minRank = 1;
    maxRank = 4;
  } else if (seasonPoints >= 30) {
    minRank = 3;
    maxRank = 8;
  } else if (seasonPoints >= 15) {
    minRank = 6;
    maxRank = 14;
  } else {
    minRank = 12;
    maxRank = rankings.teams.length;
  }

  const pool = rankings.teams.filter(
    (entry) => entry.rank >= minRank && entry.rank <= maxRank && entry.team.id !== currentTeamId,
  );
  const fallback = rankings.teams.filter((entry) => entry.team.id !== currentTeamId);
  const candidates = pool.length > 0 ? pool : fallback;
  const index = Math.floor(rng() * candidates.length);
  return candidates[index]!.team.id;
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
