import { EntityManager } from "@mikro-orm/postgresql";
import { QueryOrder } from "@mikro-orm/core";
import type { LineupQueries } from "../../application/ports";
import { MatchLineupPlayer } from "./match-lineup.entities";

export class CompetitionLineupQueries implements LineupQueries {
  constructor(private readonly em: Pick<EntityManager, "find">) {}

  async byMatch(matchId: string) {
    const rows = await this.em.find(
      MatchLineupPlayer,
      { match: matchId },
      { orderBy: { position: "ASC" }, populate: ["player"] },
    );

    return rows.map(({ participant, player }) => ({
      participantId: participant.id,
      player: {
        id: player.id,
        imageUrl: player.imageUrl,
        name: player.name,
        nationality: player.nationality,
        slug: player.slug,
      },
    }));
  }

  async byPlayer(playerId: string) {
    const rows = await this.em.find(
      MatchLineupPlayer,
      { player: playerId },
      {
        orderBy: [{ match: { beginAt: QueryOrder.DESC_NULLS_LAST } }, { id: "ASC" }],
        populate: ["participant.players"],
      },
    );

    return rows.map(({ match, participant }) => ({
      matchId: match.id,
      participantId: participant.id,
      rosterIds: participant.players.getItems().map(({ id }) => id),
    }));
  }
}
