import type { EntityManager } from "@mikro-orm/postgresql";
import { QueryOrder, raw } from "@mikro-orm/core";
import { Tournament } from "./tournament.entity";
import { TournamentEvent } from "./tournament-event.entity";
import { toTournament, toTournamentEvent } from "./competition.mapper";
import { stageFilter } from "./stage-filter";
import { isUuid } from "../../../common/domain/entity-ref";
import type { EventListing, EventQueries } from "../../application/ports";
import type { TournamentListOptions } from "../../application/inputs";

export class CompetitionEventQueries implements EventQueries {
  constructor(private readonly em: EntityManager) {}
  async list({
    limit,
    offset = 0,
    ...filters
  }: TournamentListOptions): Promise<[EventListing[], number]> {
    const where = stageFilter(filters);

    const [page, count] = await Promise.all([
      this.em
        .createQueryBuilder(Tournament, "t")
        .select(raw('t.event_id as "id"'))
        .where(where)
        .groupBy("t.event")
        .orderBy([
          { [raw("max(t.begin_at)")]: QueryOrder.DESC_NULLS_LAST },
          { event: QueryOrder.ASC },
        ])
        .limit(limit)
        .offset(offset)
        .execute<{ id: string }[]>("all", false),
      this.em.createQueryBuilder(Tournament, "t").where(where).getCount("event", true),
    ]);

    const ids = page.map((row) => row.id);

    if (!ids.length) {
      return [[], count];
    }

    const [events, stages] = await Promise.all([
      this.em.find(TournamentEvent, { id: { $in: ids } }, { populate: ["league"] }),
      this.em.find(
        Tournament,
        { $and: [where, { event: { $in: ids } }] },
        {
          populate: [
            "league",
            "event",
            "winner.team",
            "winner.players",
            "participants.team",
            "participants.players",
          ],
        },
      ),
    ]);

    const byId = new Map(events.map((row) => [row.id, toTournamentEvent(row)]));

    return [
      ids.flatMap((id) => {
        const event = byId.get(id);

        return event
          ? [{ event, stages: stages.filter((s) => s.event.id === id).map(toTournament) }]
          : [];
      }),
      count,
    ];
  }
  async find(idOrSlug: string): Promise<EventListing | null> {
    const row = await this.em.findOne(
      TournamentEvent,
      isUuid(idOrSlug) ? { id: idOrSlug.toLowerCase() } : { slug: idOrSlug },
      { populate: ["league"] },
    );

    if (!row) {
      return null;
    }

    const stages = await this.em.find(
      Tournament,
      { event: row.id },
      {
        orderBy: { beginAt: QueryOrder.ASC_NULLS_LAST, id: QueryOrder.ASC },
        populate: [
          "league",
          "event",
          "winner.team",
          "winner.players",
          "participants.team",
          "participants.players",
        ],
      },
    );

    return { event: toTournamentEvent(row), stages: stages.map(toTournament) };
  }
  async unsynced(): Promise<EventListing[]> {
    const rows = await this.em.find(
      TournamentEvent,
      { pandascoreSerieId: null },
      { populate: ["league"], orderBy: { createdAt: QueryOrder.DESC, id: QueryOrder.ASC } },
    );

    if (!rows.length) {
      return [];
    }

    const stages = await this.em.find(
      Tournament,
      { event: { $in: rows.map((row) => row.id) } },
      {
        orderBy: { beginAt: QueryOrder.ASC_NULLS_LAST, id: QueryOrder.ASC },
        populate: [
          "league",
          "event",
          "winner.team",
          "winner.players",
          "participants.team",
          "participants.players",
        ],
      },
    );

    return rows.map((row) => ({
      event: toTournamentEvent(row),
      stages: stages.filter((stage) => stage.event.id === row.id).map(toTournament),
    }));
  }
  async stageId(eventSlug: string, stageSlug: string) {
    const row = await this.em.findOne(Tournament, { slug: stageSlug, event: { slug: eventSlug } });

    return row?.id ?? null;
  }
}
