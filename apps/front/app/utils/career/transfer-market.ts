import { getSeasonsPastPeak } from "~/types/career";
import { createRng } from "~/utils/career/rng";
import type { RankedTeam, WorldRankings } from "~/utils/career/rankings";
import { getTeamRank } from "~/utils/career/rankings";

const ELITE_PLAYER_RANK = 12;
const STRONG_PLAYER_RANK = 16;
const TRANSFER_UPGRADE_MARGIN = 2;
const OFFER_SHORTLIST = 8;

interface UserStanding {
  rating: number;
  rank: number;
}

function getUserStanding(rankings: WorldRankings): UserStanding {
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
    if (member.rating < min) {
      min = member.rating;
    }
  }

  return min;
}

function teamWantsPlayer(team: RankedTeam, playerRating: number): boolean {
  return playerRating >= weakestRosterRating(team) - TRANSFER_UPGRADE_MARGIN;
}

function shuffleTeams(teams: RankedTeam[], rng: () => number): RankedTeam[] {
  const shuffled = [...teams];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const current = shuffled[i];
    const other = shuffled[j];

    if (current !== undefined && other !== undefined) {
      shuffled[i] = other;
      shuffled[j] = current;
    }
  }

  return shuffled;
}

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

  if (seasonPoints < 15) {
    return null;
  }

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

function rollOfferCount(rng: () => number, threeChance: number, twoChance: number): number {
  if (rng() < threeChance) {
    return 3;
  }

  return rng() < twoChance ? 2 : 1;
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

  if (!band) {
    return [];
  }

  const inBand = (entry: RankedTeam): boolean =>
    entry.team.id !== currentTeamId && entry.rank >= band.minRank && entry.rank <= band.maxRank;

  let pool = rankings.teams.filter(
    (entry) => inBand(entry) && teamWantsPlayer(entry, playerRating),
  );

  if (pool.length === 0) {
    pool = rankings.teams.filter(inBand);
  }

  if (pool.length === 0) {
    return [];
  }

  const rng = createRng(seed);
  let count: number;

  if (playerWorldRank <= ELITE_PLAYER_RANK) {
    count = rollOfferCount(rng, 0.45, 0.85);
  } else if (playerWorldRank <= STRONG_PLAYER_RANK) {
    count = rng() < 0.55 ? 2 : 1;
  } else if (seasonPoints >= 60) {
    count = rollOfferCount(rng, 0.35, 0.7);
  } else if (seasonPoints >= 42) {
    count = rng() < 0.4 ? 2 : 1;
  } else if (seasonPoints >= 28) {
    count = rng() < 0.65 ? 1 : 0;
  } else {
    count = rng() < 0.5 ? 1 : 0;
  }

  count = Math.min(count, band.maxOffers, pool.length);

  if (count <= 0) {
    return [];
  }

  const shortlist = pool.toSorted((a, b) => a.rank - b.rank).slice(0, OFFER_SHORTLIST);

  return shuffleTeams(shortlist, rng)
    .slice(0, count)
    .map((entry) => entry.team.id);
}

function renewalPerformanceModifier(seasonPoints: number): number {
  if (seasonPoints >= 42) {
    return 0.15;
  }

  if (seasonPoints >= 20) {
    return 0.05;
  }

  return seasonPoints < 10 ? -0.15 : 0;
}

function pickWeakestOtherTeam(currentTeamId: string, rankings: WorldRankings): string {
  const others = rankings.teams.filter((entry) => entry.team.id !== currentTeamId);
  const [weakest] = others.toSorted((a, b) => b.rank - a.rank);

  if (!weakest) {
    throw new Error("Rankings contain no team other than the current one");
  }

  return weakest.team.id;
}

export interface OffseasonResolution {
  transferTeamIds: string[];
  renewalOffered: boolean;
  lastChanceTeamId: string | null;
}

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

  const performance = renewalPerformanceModifier(seasonPoints);

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
