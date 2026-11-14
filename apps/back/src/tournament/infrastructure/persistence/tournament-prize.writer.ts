import type { EntityManager } from "@mikro-orm/postgresql";
import type { PrizeEntry } from "@sarpbc/types";
import { Player, Team } from "../../../roster/infrastructure/roster-persistence";
import type { PrizeWriter } from "../../application/ports";
import { Tournament } from "./tournament.entity";
import { TournamentParticipant } from "./tournament-participant.entity";
import { TournamentPrize } from "./tournament-prize.entities";

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

    return rows.flatMap((row) =>
      row.team
        ? [{ teamId: row.team.id, playerIds: row.players.getItems().map(({ id }) => id) }]
        : [],
    );
  }

  async entries(tournamentId: string): Promise<PrizeEntry[]> {
    const rows = await this.em.find(
      TournamentPrize,
      { tournament: tournamentId },
      { populate: ["players"], orderBy: { placement: "ASC", amount: "DESC" } },
    );

    return rows.map((row) => ({
      placement: row.placement,
      amount: row.amount,
      currency: row.currency,
      teamId: row.team.id,
      playerIds: row.players.getItems().map(({ id }) => id),
      sourceUrl: row.sourceUrl,
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
      row.sourceUrl = entry.sourceUrl;
      this.em.persist(row);
    }
  }
}
