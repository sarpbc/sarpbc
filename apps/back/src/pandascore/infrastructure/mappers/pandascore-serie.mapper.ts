import type { ProviderDeletion, UpsertSerieCommand } from "../../../tournament/application/feed";
import type { SerieDto } from "../dto/tournament.dto";

export class PandascoreSerieMapper {
  static toUpsertCommand(dto: SerieDto): UpsertSerieCommand {
    return { pandascoreId: dto.id, fullName: dto.full_name, year: dto.year };
  }
}

const MERGED = /^Merged with ([0-9]+)$/;
const REPLACED = /^Replaced by (serie|tournament) ([0-9]+)$/;

/** PandaScore deletion reasons: "Merged with <id>", "Replaced by serie|tournament <id>", "Model deleted". */
export function parseProviderDeletion(reason: string | null): ProviderDeletion {
  if (!reason) return { kind: "deleted" };
  const merged = MERGED.exec(reason);
  if (merged) return { kind: "merged", intoId: Number(merged[1]) };
  const replaced = REPLACED.exec(reason);
  if (replaced)
    return {
      kind: "replaced",
      entity: replaced[1] === "serie" ? "serie" : "tournament",
      byId: Number(replaced[2]),
    };
  return { kind: "deleted" };
}
