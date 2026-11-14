import { EntityManager } from "@mikro-orm/postgresql";
import type { FilterQuery } from "@mikro-orm/core";
import { Tournament as TournamentRow } from "./tournament.entity";
import { League as LeagueRow } from "./league.entity";
import { TournamentEvent as TournamentEventRow } from "./tournament-event.entity";
import type { TournamentEvent } from "../../domain/tournament-event";
import type { EventWriter } from "../../application/ports";
import { toTournamentEvent } from "./competition.mapper";
import { unchangedJson } from "./unchanged-json";

export class CompetitionEventWriter implements EventWriter {
  constructor(private readonly em: EntityManager) {}
  private async find(where: FilterQuery<TournamentEventRow>) {
    const row = await this.em.findOne(TournamentEventRow, where, {
      populate: ["league"],
      orderBy: { id: "ASC" },
    });

    return row ? toTournamentEvent(row) : null;
  }
  async load(id: string) {
    return await this.find({ id });
  }
  async bySerieId(id: number) {
    return await this.find({ pandascoreSerieId: id });
  }
  async unclaimedByName(leagueId: string | null, name: string) {
    return await this.find({
      pandascoreSerieId: null,
      league: leagueId,
      name,
      stages: { $none: { source: { $ne: "pandascore" } } },
    });
  }
  async slugTaken(slug: string, exceptEventId: string | null) {
    const where: FilterQuery<TournamentEventRow> =
      exceptEventId !== null && exceptEventId !== ""
        ? { slug, id: { $ne: exceptEventId } }
        : { slug };

    return (await this.em.count(TournamentEventRow, where)) > 0;
  }
  async stageSlugTaken(eventId: string, slug: string, exceptTournamentId: string) {
    return (
      (await this.em.count(TournamentRow, {
        event: eventId,
        slug,
        id: { $ne: exceptTournamentId },
      })) > 0
    );
  }
  async stages(eventId: string) {
    const rows = await this.em.find(
      TournamentRow,
      { event: eventId },
      { orderBy: { beginAt: "ASC", id: "ASC" } },
    );

    return rows.map(({ id, name, source }) => ({ id, name, source }));
  }
  async save(model: TournamentEvent) {
    const row =
      (await this.em.findOne(TournamentEventRow, { id: model.id })) ??
      Object.assign(new TournamentEventRow(), { id: model.id });

    Object.assign(row, {
      pandascoreSerieId: model.pandascoreSerieId,
      slug: model.slug,
      name: model.name,
      streams: unchangedJson(row.streams, model.streams),
      viewership: unchangedJson(row.viewership, model.viewership),
    });
    row.league = model.league ? this.em.getReference(LeagueRow, model.league.id) : null;
    this.em.persist(row);
  }
  async remove(id: string) {
    const row = await this.em.findOne(TournamentEventRow, { id });

    if (row) {
      this.em.remove(row);
    }
  }
}
