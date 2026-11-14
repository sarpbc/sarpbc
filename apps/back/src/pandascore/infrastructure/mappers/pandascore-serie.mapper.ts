import type { ProviderDeletion, UpsertSerieCommand } from "../../../tournament/application/feed";
import type { SerieDto } from "../dto/tournament.dto";

export function toUpsertSerieCommand(dto: SerieDto): UpsertSerieCommand {
  return { pandascoreId: dto.id, fullName: dto.full_name, year: dto.year };
}

const MERGED = /^Merged with (?<id>[0-9]+)$/;
const REPLACED = /^Replaced by (?<entity>serie|tournament) (?<id>[0-9]+)$/;

/** PandaScore deletion reasons: "Merged with <id>", "Replaced by serie|tournament <id>", "Model deleted". */
export function parseProviderDeletion(reason: string | null): ProviderDeletion {
  if (reason === null || reason === "") {
    return { kind: "deleted" };
  }

  const merged = MERGED.exec(reason);

  if (merged?.groups) {
    return { kind: "merged", intoId: Number(merged.groups.id) };
  }

  const replaced = REPLACED.exec(reason);

  if (replaced?.groups) {
    return {
      kind: "replaced",
      entity: replaced.groups.entity === "serie" ? "serie" : "tournament",
      byId: Number(replaced.groups.id),
    };
  }

  return { kind: "deleted" };
}
