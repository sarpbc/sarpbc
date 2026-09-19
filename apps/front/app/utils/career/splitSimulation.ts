import type {
  CareerPlacement,
  CareerRegion,
  CareerRole,
  CareerSplitFieldResult,
  CareerSplitRecord,
  CareerStage,
  CareerStats,
  CareerWorldState,
} from "~/types/career";
import {
  CAREER_REGIONS,
  MAJOR_QUALIFICATION_POINTS,
  MAX_EVENTS_BEFORE_SPLIT,
  REGIONALS_PER_SPLIT,
  WORLDS_QUALIFICATION_RANK,
  getSplitStage,
} from "~/types/career";
import { WORLD_TEAMS, getWorldTeamsByRegion } from "~/data/career/world";
import { playSingleElim } from "~/utils/career/brackets";
import { MAJOR_POINTS, REGIONAL_POINTS, regionalCircuitWeight } from "~/utils/career/points";
import { createRng, hashString } from "~/utils/career/rng";
import { getRosterMatchStrength } from "~/utils/career/roster";
import { computeComposite } from "~/utils/career/stats";

export { createRng, hashString } from "~/utils/career/rng";

export interface SplitSimulation {
  regionals: CareerPlacement[];
  major: CareerPlacement | null;
  points: number;
}

export interface FieldPlayer {
  teamId: string | null;
  rating: number;
  stats: CareerStats;
  role: CareerRole;
  skipRegionals?: number;
  skipMajor?: boolean;
}

function blendWithTeam(personal: number, teamStrength: number | undefined): number {
  if (teamStrength == null) return personal;
  return personal * 0.55 + teamStrength * 0.45;
}

function teamFieldStrength(teamId: string, world: CareerWorldState, player: FieldPlayer): number {
  const team = WORLD_TEAMS.find((entry) => entry.id === teamId);
  const rosterIds = world.rosters[teamId] ?? (team ? [...team.players] : []);
  const rosterStrength = rosterIds.length
    ? getRosterMatchStrength(rosterIds, world, player)
    : (team?.baseStrength ?? 50);
  if (teamId === player.teamId) {
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

export function getEventsBeforeStage(careerId: string, season: number, stage: CareerStage): number {
  if (stage === "worlds") return 1;
  return 1 + (hashString(`${careerId}:events:${season}:${stage}`) % MAX_EVENTS_BEFORE_SPLIT);
}

export function qualifiesForWorlds(rank: number, teamCount: number): boolean {
  return rank <= Math.min(WORLDS_QUALIFICATION_RANK, teamCount);
}
