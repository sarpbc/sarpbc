import { getSeasonsPastPeak } from "~/types/career";
import { createRng } from "~/utils/career/rng";
import type { RankedTeam, WorldRankings } from "~/utils/career/rankings";
import { getTeamRank } from "~/utils/career/rankings";

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
