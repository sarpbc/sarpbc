import type { CircuitScaleTier } from "@sarpbc/types";
import { MAX_CIRCUIT_PLACEMENT, MAX_CIRCUIT_POINTS, MAX_CIRCUIT_SCALE_TIERS } from "@sarpbc/utils";
import { InvalidInputError } from "../../common/domain/errors";
import { isLiquipediaHost } from "../../roster/domain/team-logo";

function isWhole(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}

export function parseCircuitScale(tiers: readonly CircuitScaleTier[]): CircuitScaleTier[] {
  if (tiers.length > MAX_CIRCUIT_SCALE_TIERS)
    throw new InvalidInputError(`A points scale has at most ${MAX_CIRCUIT_SCALE_TIERS} tiers.`);
  for (const { from, to, points } of tiers) {
    if (!isWhole(from, 1, MAX_CIRCUIT_PLACEMENT) || !isWhole(to, from, MAX_CIRCUIT_PLACEMENT))
      throw new InvalidInputError(
        `Placements must be whole numbers from 1 to ${MAX_CIRCUIT_PLACEMENT}, with "to" not before "from".`,
      );
    if (!isWhole(points, 0, MAX_CIRCUIT_POINTS))
      throw new InvalidInputError(
        `Points must be a whole number between 0 and ${MAX_CIRCUIT_POINTS}.`,
      );
  }
  const sorted = [...tiers]
    .sort((a, b) => a.from - b.from)
    .map(({ from, to, points }) => ({ from, to, points }));
  sorted.forEach((tier, index) => {
    const previous = sorted[index - 1];
    if (previous && tier.from <= previous.to)
      throw new InvalidInputError(
        `Placement ${tier.from} appears in two tiers. Each placement belongs to one tier.`,
      );
  });
  return sorted;
}

export function pointsForPlacement(
  scale: readonly CircuitScaleTier[],
  placement: number,
): number | null {
  return scale.find((tier) => tier.from <= placement && placement <= tier.to)?.points ?? null;
}

export function assertCircuitSourceUrl(value: string): void {
  if (!URL.canParse(value) || !/^https?:$/.test(new URL(value).protocol))
    throw new InvalidInputError("A circuit source must be an http(s) URL.");
  if (isLiquipediaHost(new URL(value).hostname))
    throw new InvalidInputError(
      "Liquipedia is not an accepted source; cite the official rules or announcement.",
    );
}
