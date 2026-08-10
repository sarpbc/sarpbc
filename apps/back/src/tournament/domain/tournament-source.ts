import { BadRequestException } from "@nestjs/common";

export const TOURNAMENT_SOURCES = ["pandascore", "manual"] as const;

export type TournamentSource = (typeof TOURNAMENT_SOURCES)[number];

export function isTournamentSource(value: string): value is TournamentSource {
  return (TOURNAMENT_SOURCES as readonly string[]).includes(value);
}

/** HTTP/MCP write path: only manual tournaments are editable. */
export function assertManualTournamentWritable(source: TournamentSource, action: string): void {
  if (source !== "manual") {
    throw new BadRequestException(
      `This tournament is synced from PandaScore and cannot be ${action}. Create a manual tournament instead.`,
    );
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
