import type {
  CareerPlacement,
  CareerRankSnapshotEntry,
  CareerRegion,
  CareerRole,
  CareerSeasonRecord,
  CareerSplitFieldResult,
  CareerSplitRecord,
  CareerStage,
  CareerStats,
  CareerTrophy,
  CareerWorldState,
} from "~/types/career";
import {
  CAREER_REGIONS,
  MAJOR_QUALIFICATION_POINTS,
  MAX_EVENTS_BEFORE_SPLIT,
  REGIONALS_PER_SPLIT,
  USER_ROSTER_ID,
  WORLDS_QUALIFICATION_RANK,
  getSeasonsPastPeak,
  getSplitStage,
} from "~/types/career";
import type { CareerWorldTeam } from "~/data/career/world";
import { WORLD_TEAMS, getWorldTeamsByRegion } from "~/data/career/world";
import { playSingleElim } from "~/utils/career/brackets";
import { createRng, hashString } from "~/utils/career/rng";
import { getRosterMatchStrength, getRosterStrength } from "~/utils/career/roster";
import { computeComposite } from "~/utils/career/stats";

export { createRng, hashString } from "~/utils/career/rng";

export const REGIONAL_POINTS: Record<CareerPlacement, number> = {
  winner: 10,
  finalist: 7,
  top4: 5,
  top8: 3,
  group: 1,
  unavailable: 0,
};

/** International majors are worth double a regional finish. */
export const MAJOR_POINTS: Record<CareerPlacement, number> = {
  winner: 20,
  finalist: 14,
  top4: 10,
  top8: 6,
  group: 2,
  unavailable: 0,
};

/** Regional circuit points scale with the region's depth. Majors are unweighted. */
export function regionalCircuitWeight(region: CareerRegion): number {
  switch (region) {
    case "eu":
      return 1;
    case "na":
      return 0.9;
    case "sam":
    case "mena":
      return 0.75;
    case "oce":
    case "apac":
      return 0.55;
    case "ssa":
      return 0.5;
    default: {
      const _exhaustive: never = region;
      return _exhaustive;
    }
  }
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
  if (sim.major === "winner") return { rating: 5, morale: 4 };
  if (sim.major === "finalist" || sim.major === "top4") return { rating: 2, morale: 2 };
  if (sim.major === "unavailable") return { morale: -2, form: -1 };
  if (sim.major !== null) return { form: 1 };
  return { morale: -3 };
}

export function getWorldsFeedback(placement: CareerPlacement): Partial<CareerStats> {
  switch (placement) {
    case "winner":
      return { rating: 5, morale: 5 };
    case "finalist":
      return { rating: 3, morale: 3 };
    case "top4":
      return { rating: 2, morale: 2 };
    case "top8":
      return { morale: 1 };
    case "group":
      return { morale: -2 };
    case "unavailable":
      return { morale: -2 };
    default: {
      const _exhaustive: never = placement;
      return _exhaustive;
    }
  }
}

/** Circuit points are split results only. Worlds is prestige, not ranking points. */
export function computeCircuitPoints(splits: CareerSplitRecord[]): number {
  return computeSeasonPoints(splits);
}

export interface FieldPlayer {
  teamId: string | null;
  rating: number;
  stats?: CareerStats;
  role?: CareerRole | null;
  skipRegionals?: number;
  skipMajor?: boolean;
}

function teamFieldStrength(teamId: string, world: CareerWorldState, player: FieldPlayer): number {
  const team = WORLD_TEAMS.find((entry) => entry.id === teamId);
  const rosterIds = world.rosters[teamId] ?? (team ? [...team.players] : []);
  const rosterStrength = rosterIds.length
    ? getRosterMatchStrength(rosterIds, world, player)
    : (team?.baseStrength ?? 50);
  if (teamId === player.teamId && player.stats && player.role) {
    return blendWithTeam(computeComposite(player.stats, player.role), rosterStrength);
  }
  return rosterStrength;
}

function eventRng(careerId: string, season: number, key: string): () => number {
  return createRng(hashString(`${careerId}:sim:${season}:${key}`));
}

function emptySplitSimulation(): SplitSimulation {
  return {
    regionals: Array.from({ length: REGIONALS_PER_SPLIT }, () => "group"),
    major: null,
    points: 0,
  };
}

function rawRegionalPoints(sim: Pick<SplitSimulation, "regionals">): number {
  return sim.regionals.reduce((sum, placement) => sum + REGIONAL_POINTS[placement], 0);
}

export function circuitPointsForSplit(
  sim: Pick<SplitSimulation, "regionals" | "major">,
  region: CareerRegion,
): number {
  const regional = Math.round(rawRegionalPoints(sim) * regionalCircuitWeight(region));
  const major = sim.major ? MAJOR_POINTS[sim.major] : 0;
  return regional + major;
}

/** Play every regional and the major as real brackets. One winner per event. */
export function simulateSplitField(
  careerId: string,
  season: number,
  split: number,
  world: CareerWorldState,
  player: FieldPlayer,
): Map<string, SplitSimulation> {
  const results = new Map<string, SplitSimulation>();
  for (const team of WORLD_TEAMS) {
    results.set(team.id, emptySplitSimulation());
  }

  const stage = getSplitStage(split);
  const skipRegionals = player.skipRegionals ?? 0;
  for (const region of CAREER_REGIONS) {
    for (let regional = 0; regional < REGIONALS_PER_SPLIT; regional++) {
      const sitOut =
        player.teamId != null &&
        skipRegionals > regional &&
        getWorldTeamsByRegion(region).some((team) => team.id === player.teamId);
      const field = getWorldTeamsByRegion(region)
        .filter((team) => !(sitOut && team.id === player.teamId))
        .map((team) => ({
          id: team.id,
          strength: teamFieldStrength(team.id, world, player),
        }));
      const placements = playSingleElim(
        field,
        eventRng(careerId, season, `${stage}:${region}:r${regional}`),
      );
      for (const [teamId, placement] of placements) {
        const sim = results.get(teamId);
        if (!sim) continue;
        sim.regionals[regional] = placement;
      }
      if (sitOut && player.teamId) {
        const sim = results.get(player.teamId);
        if (sim) sim.regionals[regional] = "unavailable";
      }
    }
  }

  const majorField: { id: string; strength: number }[] = [];
  for (const [teamId, sim] of results) {
    const regionalPoints = rawRegionalPoints(sim);
    if (regionalPoints < MAJOR_QUALIFICATION_POINTS) continue;
    if (player.skipMajor && teamId === player.teamId) {
      sim.major = "unavailable";
      continue;
    }
    majorField.push({ id: teamId, strength: teamFieldStrength(teamId, world, player) });
  }
  const majorPlacements = playSingleElim(majorField, eventRng(careerId, season, `${stage}:major`));
  for (const [teamId, placement] of majorPlacements) {
    const sim = results.get(teamId);
    if (sim) sim.major = placement;
  }

  for (const team of WORLD_TEAMS) {
    const sim = results.get(team.id);
    if (sim) sim.points = circuitPointsForSplit(sim, team.region);
  }
  return results;
}

export function splitFieldToResult(
  season: number,
  split: number,
  field: Map<string, SplitSimulation>,
): CareerSplitFieldResult {
  const points: Record<string, number> = {};
  for (const [teamId, sim] of field) {
    points[teamId] = sim.points;
  }
  return { season, split, points };
}

export function upsertSplitField(
  fields: CareerSplitFieldResult[],
  next: CareerSplitFieldResult,
): CareerSplitFieldResult[] {
  return [
    ...fields.filter((field) => !(field.season === next.season && field.split === next.split)),
    next,
  ];
}

/** Worlds knockout among the qualified field. Prestige only — no circuit points. */
export function simulateWorldsField(
  careerId: string,
  season: number,
  world: CareerWorldState,
  qualifiedTeamIds: readonly string[],
  player: FieldPlayer,
): Map<string, CareerPlacement> {
  const field = qualifiedTeamIds.map((teamId) => ({
    id: teamId,
    strength: teamFieldStrength(teamId, world, player),
  }));
  return playSingleElim(field, eventRng(careerId, season, "worlds"));
}

/** Two splits every season. 1–3 decisions before each split; Worlds is one. */
export function getEventsBeforeStage(careerId: string, season: number, stage: CareerStage): number {
  if (stage === "worlds") return 1;
  return 1 + (hashString(`${careerId}:events:${season}:${stage}`) % MAX_EVENTS_BEFORE_SPLIT);
}

export function qualifiesForWorlds(rank: number, teamCount: number): boolean {
  return rank <= Math.min(WORLDS_QUALIFICATION_RANK, teamCount);
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
  /** Score used to order the table: strength before the year, circuit points after. */
  rating: number;
  /** Circuit points this season (regionals scaled by region, majors full). */
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

export function snapshotWorldRanking(rankings: WorldRankings): CareerRankSnapshotEntry[] {
  return rankings.teams.map((entry) => ({ teamId: entry.team.id, points: entry.points }));
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
  const field = (world.splitFields ?? []).find(
    (entry) => entry.season === season && entry.split === split,
  );
  return field?.points ?? null;
}

function npcSplitPointsByTeam(
  careerId: string,
  player: PlayerCircuitInput,
  world: CareerWorldState,
  split: number,
): Map<string, number> {
  const stored = storedSplitPoints(world, player.season, split);
  if (stored) return new Map(Object.entries(stored));

  const field = simulateSplitField(careerId, player.season, split, world, {
    teamId: player.teamId,
    rating: player.rating,
  });
  const points = new Map<string, number>();
  for (const [teamId, sim] of field) {
    points.set(teamId, sim.points);
  }
  return points;
}

export function computeWorldRankings(
  careerId: string,
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
    npcSplitCaches.push(npcSplitPointsByTeam(careerId, player, world, split));
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

/** Rookies start on the weakest team of their region. */
export function pickStartingTeam(region: CareerRegion): string {
  const teams = getWorldTeamsByRegion(region);
  const weakest = [...teams].sort((a, b) => a.baseStrength - b.baseStrength)[0];
  return weakest!.id;
}

const ELITE_PLAYER_RANK = 12;
const STRONG_PLAYER_RANK = 16;
/** Clubs bid if you are within this of their weakest starter. */
const TRANSFER_UPGRADE_MARGIN = 2;
/** Elite bids come from the best interested clubs, not a random mid-table draw. */
const OFFER_SHORTLIST = 8;

function getUserStanding(rankings: WorldRankings): { rating: number; rank: number } {
  const user = rankings.players.find((player) => player.isUser);
  return {
    rating: user?.rating ?? 0,
    rank: user?.rank ?? rankings.players.length + 1,
  };
}

/** Matching the 8th-best rating counts as elite, even when listed just outside the cut. */
function marketPlayerRank(
  rankings: WorldRankings,
  playerRating: number,
  playerRank: number,
): number {
  const eighthRating = rankings.players[7]?.rating;
  if (eighthRating !== undefined && playerRating >= eighthRating) {
    return Math.min(playerRank, 8);
  }
  const sixteenthRating = rankings.players[STRONG_PLAYER_RANK - 1]?.rating;
  if (sixteenthRating !== undefined && playerRating >= sixteenthRating) {
    return Math.min(playerRank, STRONG_PLAYER_RANK);
  }
  return playerRank;
}

function weakestRosterRating(team: RankedTeam): number {
  let min = Infinity;
  for (const member of team.roster) {
    if (member.rating < min) min = member.rating;
  }
  return min;
}

function teamWantsPlayer(team: RankedTeam, playerRating: number): boolean {
  return playerRating >= weakestRosterRating(team) - TRANSFER_UPGRADE_MARGIN;
}

function shuffleTeams(teams: RankedTeam[], rng: () => number): RankedTeam[] {
  const shuffled = [...teams];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const current = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = current;
  }
  return shuffled;
}

/**
 * Offseason interest. A top individual ranking opens better clubs even after
 * a quiet circuit year. Mid talent still needs results; a weak year then
 * never attracts a top-4 side.
 */
export function getTransferBand(
  seasonPoints: number,
  currentRank: number,
  playerWorldRank: number,
): { minRank: number; maxRank: number; maxOffers: number } | null {
  const betterMax = Math.max(1, currentRank - 1);

  if (playerWorldRank <= ELITE_PLAYER_RANK) {
    return { minRank: 1, maxRank: betterMax, maxOffers: 3 };
  }
  if (playerWorldRank <= STRONG_PLAYER_RANK) {
    return {
      minRank: seasonPoints >= 28 ? 1 : 5,
      maxRank: betterMax,
      maxOffers: 2,
    };
  }
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
  const { rating: playerRating, rank: listedRank } = getUserStanding(rankings);
  const playerWorldRank = marketPlayerRank(rankings, playerRating, listedRank);
  const band = getTransferBand(seasonPoints, currentRank, playerWorldRank);
  if (!band) return [];

  const inBand = (entry: RankedTeam): boolean =>
    entry.team.id !== currentTeamId && entry.rank >= band.minRank && entry.rank <= band.maxRank;

  let pool = rankings.teams.filter(
    (entry) => inBand(entry) && teamWantsPlayer(entry, playerRating),
  );
  if (pool.length === 0) {
    pool = rankings.teams.filter(inBand);
  }
  if (pool.length === 0) return [];

  const rng = createRng(seed);
  let count: number;
  if (playerWorldRank <= ELITE_PLAYER_RANK) {
    count = rng() < 0.45 ? 3 : rng() < 0.85 ? 2 : 1;
  } else if (playerWorldRank <= STRONG_PLAYER_RANK) {
    count = rng() < 0.55 ? 2 : 1;
  } else if (seasonPoints >= 60) {
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

  const shortlist = [...pool].sort((a, b) => a.rank - b.rank).slice(0, OFFER_SHORTLIST);
  return shuffleTeams(shortlist, rng)
    .slice(0, count)
    .map((entry) => entry.team.id);
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
 * Peak years always renew. Transfer interest is 0–3 clubs matching rating
 * versus the field, with season results still gating mid-tier talent.
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
