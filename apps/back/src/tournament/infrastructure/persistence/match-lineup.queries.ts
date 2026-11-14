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
      { populate: ["player"], orderBy: { position: "ASC" } },
    );

    return rows.map(({ participant, player }) => ({
      participantId: participant.id,
      player: {
        id: player.id,
        name: player.name,
        slug: player.slug,
        imageUrl: player.imageUrl,
        nationality: player.nationality,
      },
    }));
  }

  async byPlayer(playerId: string) {
    const rows = await this.em.find(
      MatchLineupPlayer,
      { player: playerId },
      {
        populate: ["participant.players"],
        orderBy: { match: { beginAt: QueryOrder.DESC_NULLS_LAST }, id: "ASC" },
      },
    );

    return rows.map(({ match, participant }) => ({
      matchId: match.id,
      participantId: participant.id,
      rosterIds: participant.players.getItems().map(({ id }) => id),
    }));
  }
}
