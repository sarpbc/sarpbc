import type { TournamentListOptions } from "../../application/inputs";

interface StageFilter {
  pickemsEnabled?: boolean;
  winner?: null;
  $or?: [{ endAt: null }, { endAt: { $gt: Date } }];
}

export const stageFilter = ({
  pickems,
  activeOnly = false,
}: Pick<TournamentListOptions, "pickems" | "activeOnly">) => {
  const where: StageFilter = {};

  if (pickems !== undefined) {
    where.pickemsEnabled = pickems;
  }

  if (activeOnly) {
    where.winner = null;
    where.$or = [{ endAt: null }, { endAt: { $gt: new Date() } }];
  }

  return where;
};
