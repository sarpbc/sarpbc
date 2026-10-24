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
      const { imageUrl, endAt, ...syncedFields } = patch;
      if (
        (imageUrl !== undefined || endAt !== undefined) &&
        Object.values(syncedFields).every((value) => value === undefined)
      ) {
        return;
      }
      throw new InvalidInputError(
        "Only the image and the end date can be edited on a PandaScore tournament. Send imageUrl or endAt alone, or null to clear them.",
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

/**
 * A manual tournament that PandaScore also lists becomes the synced tournament, so the provider
 * keeps one local row. A staff end date survives as a correction when PandaScore has none.
 */
export function claimForPandascore(
  tournament: {
    id: string;
    source: DataSource;
    pandascoreId: number | null;
    endAt: Date | null;
    endAtCorrected: boolean;
  },
  pandascoreId: number,
  providerEndAt: Date | null,
): void {
  if (tournament.source !== "manual")
    throw new InvalidInputError(
      `Only manual tournaments can be linked to PandaScore; this one is source=${tournament.source}.`,
    );
  tournament.source = "pandascore";
  tournament.pandascoreId = pandascoreId;
  tournament.endAtCorrected = tournament.endAt !== null && providerEndAt === null;
}
