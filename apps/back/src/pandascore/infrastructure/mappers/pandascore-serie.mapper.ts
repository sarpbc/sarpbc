import type { ProviderDeletion } from "../../../tournament/application/feed";
import type { SerieDto } from "../dto/tournament.dto";

export const toUpsertSerieCommand = (dto: SerieDto) => ({
  fullName: dto.full_name,
  pandascoreId: dto.id,
  year: dto.year,
});

const MERGED = /^Merged with (?<id>[0-9]+)$/u;
const REPLACED = /^Replaced by (?<entity>serie|tournament) (?<id>[0-9]+)$/u;

/** PandaScore deletion reasons: "Merged with <id>", "Replaced by serie|tournament <id>", "Model deleted". */
export const parseProviderDeletion = ((reason) => {
  if (reason === null || reason === "") {
    return { kind: "deleted" };
  }

  const merged = MERGED.exec(reason);

  if (merged?.groups) {
    return { intoId: Number(merged.groups.id), kind: "merged" };
  }

  const replaced = REPLACED.exec(reason);

  if (replaced?.groups) {
    return {
      byId: Number(replaced.groups.id),
      entity: replaced.groups.entity === "serie" ? "serie" : "tournament",
      kind: "replaced",
    };
  }

  return { kind: "deleted" };
}) satisfies (reason: string | null) => ProviderDeletion;
