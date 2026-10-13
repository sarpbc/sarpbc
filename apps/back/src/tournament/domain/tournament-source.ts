import { BadRequestException } from "@nestjs/common";
import type { UpdateTournamentDto } from "../dto/create-tournament.dto";

export const TOURNAMENT_SOURCES = ["pandascore", "manual"] as const;

export type TournamentSource = (typeof TOURNAMENT_SOURCES)[number];

export function isTournamentSource(value: string): value is TournamentSource {
  return (TOURNAMENT_SOURCES as readonly string[]).includes(value);
}

export function assertTournamentUpdateAllowed(
  source: TournamentSource,
  patch: UpdateTournamentDto,
): void {
  switch (source) {
    case "manual":
      return;
    case "pandascore": {
      const { imageUrl, ...syncedFields } = patch;
      if (
        imageUrl !== undefined &&
        Object.values(syncedFields).every((value) => value === undefined)
      ) {
        return;
      }
      throw new BadRequestException(
        "Only the image can be edited on a PandaScore tournament. Send imageUrl alone, or null to clear it.",
      );
    }
    default: {
      const exhaustive: never = source;
      return exhaustive;
    }
  }
}

/** Sync-by-id: never pull PandaScore into a manual row. */
export function assertPandascoreSyncAllowed(source: TournamentSource): void {
  if (source === "manual") {
    throw new Error("Cannot sync a manual tournament from PandaScore");
  }
}

/**
 * Upsert-by-pandascoreId: a manual row matching a PandaScore id is data corruption.
 * Fail loud — do not silently no-op.
 */
export function assertPandascoreUpsertAllowed(
  tournament: { id: string; source: TournamentSource },
  pandascoreId: number,
): void {
  if (tournament.source === "manual") {
    throw new Error(
      `Refusing PandaScore upsert for id ${pandascoreId}: tournament ${tournament.id} is source=manual`,
    );
  }
}
