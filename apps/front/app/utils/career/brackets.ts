import type { CareerPlacement } from "~/types/career";

export interface BracketEntrant {
  id: string;
  strength: number;
}

function nextPowerOfTwo(n: number): number {
  let size = 1;
  while (size < n) size *= 2;
  return size;
}

/** Standard single-elim seed order: 1vN, 2vN-1, nested halves. */
function seedSlots(size: number): number[] {
  if (size <= 1) return [0];
  const half = seedSlots(size / 2);
  const slots: number[] = [];
  for (const seed of half) {
    slots.push(seed);
    slots.push(size - 1 - seed);
  }
  return slots;
}

function playMatch(a: BracketEntrant, b: BracketEntrant, rng: () => number): BracketEntrant {
  const scoreA = a.strength + rng() * 28;
  const scoreB = b.strength + rng() * 28;
  if (scoreA === scoreB) return rng() < 0.5 ? a : b;
  return scoreA > scoreB ? a : b;
}

function placementForLosers(winnersAdvancing: number): CareerPlacement {
  if (winnersAdvancing <= 1) return "finalist";
  if (winnersAdvancing <= 2) return "top4";
  if (winnersAdvancing <= 4) return "top8";
  return "group";
}

/**
 * Single-elimination bracket. Byes pad to the next power of two.
 * Exactly one winner when the field is non-empty.
 */
export function playSingleElim(
  teams: readonly BracketEntrant[],
  rng: () => number,
): Map<string, CareerPlacement> {
  const placements = new Map<string, CareerPlacement>();
  if (teams.length === 0) return placements;
  if (teams.length === 1) {
    placements.set(teams[0]!.id, "winner");
    return placements;
  }

  const seeded = [...teams].sort((a, b) => b.strength - a.strength || a.id.localeCompare(b.id));
  const size = nextPowerOfTwo(seeded.length);
  const order = seedSlots(size);
  let round: (BracketEntrant | null)[] = order.map((seed) => seeded[seed] ?? null);

  while (round.length > 1) {
    const next: (BracketEntrant | null)[] = [];
    const winnersAdvancing = round.length / 2;
    for (let i = 0; i < round.length; i += 2) {
      const a = round[i] ?? null;
      const b = round[i + 1] ?? null;
      if (a && b) {
        const winner = playMatch(a, b, rng);
        const loser = winner.id === a.id ? b : a;
        placements.set(loser.id, placementForLosers(winnersAdvancing));
        next.push(winner);
      } else {
        next.push(a ?? b);
      }
    }
    round = next;
  }

  const champion = round[0];
  if (champion) placements.set(champion.id, "winner");
  return placements;
}
