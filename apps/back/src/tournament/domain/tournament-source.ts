import { InvalidInputError } from "../../common/domain/errors";
import type { DataSource } from "../../common/domain/data-source";

export function assertTournamentUpdateAllowed(
  source: DataSource,
  patch: {
    imageUrl?: string | null;
    name?: string;
    slug?: string;
    tier?: string | null;
    leagueId?: string | null;
    beginAt?: string | null;
    endAt?: string | null;
    teamIds?: string[];
  },
): void {
  switch (source) {
    case "manual":
    case "startgg":
      return;
    case "pandascore": {
      const { imageUrl, ...syncedFields } = patch;
      if (
        imageUrl !== undefined &&
        Object.values(syncedFields).every((value) => value === undefined)
      ) {
        return;
      }
      throw new InvalidInputError(
        "Only the image can be edited on a PandaScore tournament. Send imageUrl alone, or null to clear it.",
      );
    }
    default: {
      const exhaustive: never = source;
      return exhaustive;
    }
  }
}

export function assertPandascoreSyncAllowed(source: DataSource): void {
  if (source !== "pandascore") {
    throw new Error(`Cannot sync a ${source} tournament from PandaScore`);
  }
}

export function assertPandascoreUpsertAllowed(
  tournament: { id: string; source: DataSource },
  pandascoreId: number,
): void {
  if (tournament.source !== "pandascore") {
    throw new Error(
      `Refusing PandaScore upsert for id ${pandascoreId}: tournament ${tournament.id} is source=${tournament.source}`,
    );
  }
}
