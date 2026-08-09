import type { CareerMatchResult, CareerStats } from "~/types/career";
import { FICTIONAL_TEAMS } from "~/data/career/teams";

const STAGE_KEYS = [
  "page.game.career.stages.regional",
  "page.game.career.stages.playoffs",
  "page.game.career.stages.majorQualifier",
  "page.game.career.stages.major",
  "page.game.career.stages.worlds",
] as const;

function pickOpponent(exclude: string, seed: number): string {
  const pool = FICTIONAL_TEAMS.filter((team) => team !== exclude);
  return pool[seed % pool.length] ?? pool[0]!;
}

function winChance(stats: CareerStats): number {
  const composite = stats.rating * 0.5 + stats.form * 0.3 + stats.morale * 0.2;
  return Math.max(0.15, Math.min(0.85, composite / 100));
}

function simulateScore(
  won: boolean,
  rng: () => number,
): { scoreFor: number; scoreAgainst: number } {
  if (won) {
    const margin = 1 + Math.floor(rng() * 3);
    const scoreAgainst = Math.floor(rng() * 3);
    return { scoreFor: scoreAgainst + margin, scoreAgainst };
  }
  const margin = 1 + Math.floor(rng() * 2);
  const scoreFor = Math.floor(rng() * 3);
  return { scoreFor, scoreAgainst: scoreFor + margin };
}

export function simulateSeasonMatches(
  season: number,
  team: string,
  stats: CareerStats,
  seed: number,
): CareerMatchResult[] {
  const stageKey = STAGE_KEYS[season - 1] ?? STAGE_KEYS[0];
  const matchCount = season >= 4 ? 3 : 2;
  const results: CareerMatchResult[] = [];
  let localSeed = seed;

  const rng = () => {
    localSeed = (localSeed * 1103515245 + 12345) & 0x7fffffff;
    return localSeed / 0x7fffffff;
  };

  for (let i = 0; i < matchCount; i++) {
    const opponent = pickOpponent(team, localSeed + i);
    const won = rng() < winChance(stats);
    const { scoreFor, scoreAgainst } = simulateScore(won, rng);
    results.push({
      opponent,
      scoreFor,
      scoreAgainst,
      won,
      stage: stageKey,
    });
  }

  return results;
}

export function derivePlacement(matches: CareerMatchResult[], season: number): string {
  const wins = matches.filter((m) => m.won).length;
  const total = matches.length;

  if (season === 5) {
    if (wins === total) return "page.game.career.placements.worldsChampion";
    if (wins >= total - 1) return "page.game.career.placements.worldsFinalist";
    if (wins >= 1) return "page.game.career.placements.worldsTop8";
    return "page.game.career.placements.worldsGroup";
  }

  if (season >= 4) {
    if (wins === total) return "page.game.career.placements.majorWinner";
    if (wins >= 1) return "page.game.career.placements.majorTop4";
    return "page.game.career.placements.majorGroup";
  }

  if (wins === total) return "page.game.career.placements.regionalWinner";
  if (wins >= 1) return "page.game.career.placements.regionalTop4";
  return "page.game.career.placements.regionalGroup";
}

export function deriveTrophies(seasons: { placement: string }[]): string[] {
  const trophies: string[] = [];
  for (const season of seasons) {
    if (
      season.placement === "page.game.career.placements.worldsChampion" ||
      season.placement === "page.game.career.placements.majorWinner" ||
      season.placement === "page.game.career.placements.regionalWinner"
    ) {
      trophies.push(season.placement);
    }
  }
  return trophies;
}

export function pickOffseasonOffer(currentTeam: string, stats: CareerStats, seed: number): string {
  const pool = FICTIONAL_TEAMS.filter((t) => t !== currentTeam);
  const index = Math.floor((stats.rating + seed) % pool.length) % Math.max(pool.length, 1);
  return pool[index] ?? pool[0]!;
}

export function pickStartingTeam(region: string, seed: number): string {
  const index = (region.charCodeAt(0) + seed) % FICTIONAL_TEAMS.length;
  return FICTIONAL_TEAMS[index]!;
}
