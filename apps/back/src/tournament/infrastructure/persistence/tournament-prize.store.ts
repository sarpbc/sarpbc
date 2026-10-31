import { EntityManager } from "@mikro-orm/postgresql";
import { QueryOrder, type FilterQuery } from "@mikro-orm/core";
import type { TournamentPrize as TournamentPrizeItem } from "@sarpbc/types";
import { Player, Team } from "../../../roster/infrastructure/roster-persistence";
import type { EarningsLine } from "../../application/earnings";
import type { EarningsScope, PrizeQueries, PrizeWriter } from "../../application/ports";
import type { PrizeEntry } from "../../domain/prize-distribution";
import { stageFilter } from "./competition.queries";
import { Tournament, TournamentParticipant } from "./tournament.entities";
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
      .sort((a, b) => a.name.localeCompare(b.name)),
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
      event: {
        id: tournament.event.id,
        slug: tournament.event.slug,
        name: tournament.event.name,
      },
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
    if (!tournament) return null;
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

  private earnings(
    where: FilterQuery<TournamentPrize>,
    { redistributableOnly }: EarningsScope,
    populate: "players"[] = [],
  ) {
    return this.em.find(
      TournamentPrize,
      { $and: [where, { tournament: stageFilter({ redistributableOnly }) }] },
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

export class CompetitionPrizeWriter implements PrizeWriter {
  constructor(
    private readonly em: Pick<
      EntityManager,
      "count" | "find" | "nativeDelete" | "getReference" | "persist"
    >,
  ) {}

  async tournamentExists(id: string) {
    return (await this.em.count(Tournament, { id })) > 0;
  }

  async participants(tournamentId: string) {
    const rows = await this.em.find(
      TournamentParticipant,
      { tournament: tournamentId },
      { populate: ["players"] },
    );
    return rows.map((row) => ({
      teamId: row.team.id,
      playerIds: row.players.getItems().map(({ id }) => id),
    }));
  }

  async replace(tournamentId: string, entries: PrizeEntry[]) {
    await this.em.nativeDelete(TournamentPrize, { tournament: tournamentId });
    for (const entry of entries) {
      const row = new TournamentPrize();
      row.id = crypto.randomUUID();
      row.tournament = this.em.getReference(Tournament, tournamentId);
      row.placement = entry.placement;
      row.amount = entry.amount;
      row.currency = entry.currency;
      row.team = this.em.getReference(Team, entry.teamId);
      row.players.set(entry.playerIds.map((id) => this.em.getReference(Player, id)));
      this.em.persist(row);
    }
  }
}
