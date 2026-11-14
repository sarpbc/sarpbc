import type {
  CircuitScaleTier,
  CircuitStageFinishInput,
  CircuitStageScaleInput,
} from "@sarpbc/types";
import {
  MAX_CIRCUIT_PLACEMENT,
  MAX_CIRCUIT_POINTS,
  MAX_CIRCUIT_SCALE_TIERS,
  MAX_CIRCUIT_STAGE_TEAMS,
  isForbiddenSourceHost,
} from "@sarpbc/utils";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";

function isWhole(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}

export function parseCircuitScale(tiers: readonly CircuitScaleTier[]): CircuitScaleTier[] {
  if (tiers.length > MAX_CIRCUIT_SCALE_TIERS) {
    throw new InvalidInputError(`A points scale has at most ${MAX_CIRCUIT_SCALE_TIERS} tiers.`);
  }

  for (const { from, to, points } of tiers) {
    if (!isWhole(from, 1, MAX_CIRCUIT_PLACEMENT) || !isWhole(to, from, MAX_CIRCUIT_PLACEMENT)) {
      throw new InvalidInputError(
        `Placements must be whole numbers from 1 to ${MAX_CIRCUIT_PLACEMENT}, with "to" not before "from".`,
      );
    }

    if (!isWhole(points, 0, MAX_CIRCUIT_POINTS)) {
      throw new InvalidInputError(
        `Points must be a whole number between 0 and ${MAX_CIRCUIT_POINTS}.`,
      );
    }
  }

  const sorted = tiers
    .toSorted((a, b) => a.from - b.from)
    .map(({ from, to, points }) => ({ from, to, points }));

  for (const [index, tier] of sorted.entries()) {
    const previous: typeof tier | undefined = sorted[index - 1];

    if (previous !== undefined && tier.from <= previous.to) {
      throw new InvalidInputError(
        `Placement ${tier.from} appears in two tiers. Each placement belongs to one tier.`,
      );
    }
  }

  return sorted;
}

export function pointsForPlacement(
  scale: readonly CircuitScaleTier[],
  placement: number,
): number | null {
  return scale.find((tier) => tier.from <= placement && placement <= tier.to)?.points ?? null;
}

export function assertCircuitSourceUrl(value: string): void {
  if (!URL.canParse(value) || !/^https?:$/.test(new URL(value).protocol)) {
    throw new InvalidInputError("A circuit source must be an http(s) URL.");
  }

  if (isForbiddenSourceHost(new URL(value).hostname)) {
    throw new InvalidInputError(
      "Liquipedia and BLAST.tv are not accepted sources; cite the official rules or announcement.",
    );
  }
}

export interface CircuitStageSettings {
  scale: CircuitScaleTier[];
  sourceUrl: string;
  worldwide: boolean;
  regionTeamIds: string[];
  finishes: CircuitStageFinishInput[];
}

function requireEventTeams(teamIds: readonly string[], eventTeamIds: ReadonlySet<string>): void {
  if (teamIds.length > MAX_CIRCUIT_STAGE_TEAMS) {
    throw new InvalidInputError(`A circuit stage lists at most ${MAX_CIRCUIT_STAGE_TEAMS} teams.`);
  }

  if (new Set(teamIds).size !== teamIds.length) {
    throw new InvalidInputError("A team appears twice in the same list.");
  }

  const outsider = teamIds.find((id) => !eventTeamIds.has(id));

  if (outsider !== undefined) {
    throw new InvalidInputError(
      `Team "${outsider}" did not take part in any stage of this tournament event.`,
    );
  }
}

export function parseCircuitStageSettings(
  input: CircuitStageScaleInput,
  eventTeamIds: ReadonlySet<string>,
): CircuitStageSettings {
  assertCircuitSourceUrl(input.sourceUrl);
  const regionTeamIds = [...(input.regionTeamIds ?? [])];
  const finishes = (input.finishes ?? []).map(({ teamId, placement }) => ({ teamId, placement }));
  requireEventTeams(regionTeamIds, eventTeamIds);
  requireEventTeams(
    finishes.map(({ teamId }) => teamId),
    eventTeamIds,
  );

  if (finishes.some(({ placement }) => !isWhole(placement, 1, MAX_CIRCUIT_PLACEMENT))) {
    throw new InvalidInputError(
      `A final placement is a whole number from 1 to ${MAX_CIRCUIT_PLACEMENT}.`,
    );
  }

  return {
    scale: parseCircuitScale(input.scale),
    sourceUrl: input.sourceUrl,
    worldwide: input.worldwide ?? false,
    regionTeamIds,
    finishes: finishes.toSorted((a, b) => a.placement - b.placement),
  };
}
