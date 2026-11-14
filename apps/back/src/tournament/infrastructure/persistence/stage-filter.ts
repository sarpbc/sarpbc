import type { TournamentListOptions } from "../../application/inputs";

interface StageFilter {
  pickemsEnabled?: boolean;
  source?: { $ne: "startgg" };
  winner?: null;
  $or?: [{ endAt: null }, { endAt: { $gt: Date } }];
}

export const stageFilter = ({
  pickems,
  activeOnly = false,
  redistributableOnly = false,
}: Pick<TournamentListOptions, "pickems" | "activeOnly" | "redistributableOnly">): StageFilter => {
  const where: StageFilter = {};

  if (pickems !== undefined) {
    where.pickemsEnabled = pickems;
  }

  if (redistributableOnly) {
    where.source = { $ne: "startgg" };
  }

  if (activeOnly) {
    where.winner = null;
    where.$or = [{ endAt: null }, { endAt: { $gt: new Date() } }];
  }

  return where;
};
