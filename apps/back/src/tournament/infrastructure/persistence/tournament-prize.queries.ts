import { EntityManager } from "@mikro-orm/postgresql";
import { QueryOrder } from "@mikro-orm/core";
import type { FilterQuery } from "@mikro-orm/core";
import type { TournamentPrize as TournamentPrizeItem } from "@sarpbc/types";
import type { EarningsLine } from "../../application/earnings";
import type { EarningsScope, PrizeQueries } from "../../application/ports";
import { toEventRef } from "../../domain/tournament-event";
import { Tournament } from "./tournament.entity";
import { TournamentPrize } from "./tournament-prize.entities";

function toPrizeItem(row: TournamentPrize): TournamentPrizeItem {
  return {
    id: row.id,
    placement: row.placement,
    amount: row.amount,
    currency: row.currency,
    team: {
      id: row.team.id,
      name: row.team.name,
      slug: row.team.slug,
      imageUrl: row.team.imageUrl,
      darkModeImageUrl: row.team.darkModeImageUrl,
    },
    players: row.players
      .getItems()
      .map(({ id, name, slug }) => ({ id, name, slug }))
      .toSorted((a, b) => a.name.localeCompare(b.name)),
    sourceUrl: row.sourceUrl,
  };
}

function toEarningsLine(row: TournamentPrize, shares: number): EarningsLine {
  const { tournament } = row;

  return {
    id: row.id,
    placement: row.placement,
    amount: row.amount,
    currency: row.currency,
    shares,
    team: { id: row.team.id, name: row.team.name, slug: row.team.slug },
    tournament: {
      id: tournament.id,
      name: tournament.name,
      slug: tournament.slug,
      source: tournament.source,
      beginAt: tournament.beginAt?.toISOString() ?? null,
      endAt: tournament.endAt?.toISOString() ?? null,
      event: toEventRef(tournament.event),
    },
  };
}

export class CompetitionPrizeQueries implements PrizeQueries {
  constructor(private readonly em: Pick<EntityManager, "find" | "findOne">) {}

  async tournamentSource(id: string) {
    const tournament = await this.em.findOne(Tournament, { id }, { fields: ["source"] });

    return tournament?.source ?? null;
  }

  async byTournament(id: string) {
    const tournament = await this.em.findOne(Tournament, { id });

    if (!tournament) {
      return null;
    }

    const rows = await this.em.find(
      TournamentPrize,
      { tournament: { id } },
      { populate: ["team", "players"], orderBy: { placement: "ASC", amount: "DESC" } },
    );

    return {
      source: tournament.source,
      prizepool: tournament.prizepool,
      prizes: rows.map(toPrizeItem),
    };
  }

  async byTeam(id: string, scope: EarningsScope) {
    const rows = await this.earnings({ team: { id } }, scope);

    return rows.map((row) => toEarningsLine(row, 1));
  }

  async byPlayer(id: string, scope: EarningsScope) {
    const rows = await this.earnings({ players: { id } }, scope, ["players"]);

    return rows.map((row) => toEarningsLine(row, row.players.length));
  }

  private async earnings(
    where: FilterQuery<TournamentPrize>,
    { redistributableOnly }: EarningsScope,
    populate: "players"[] = [],
  ) {
    return await this.em.find(
      TournamentPrize,
      {
        $and: [
          where,
          { tournament: redistributableOnly ? { source: { $ne: "startgg" as const } } : {} },
        ],
      },
      {
        populate: ["team", "tournament.event", ...populate],
        orderBy: {
          tournament: { endAt: QueryOrder.DESC_NULLS_LAST, beginAt: QueryOrder.DESC },
          placement: "ASC",
        },
      },
    );
  }
}
