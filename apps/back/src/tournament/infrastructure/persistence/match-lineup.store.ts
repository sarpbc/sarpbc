import { EntityManager } from "@mikro-orm/postgresql";
import { QueryOrder } from "@mikro-orm/core";
import type { MatchLineupInput } from "@sarpbc/types";
import { Player } from "../../../roster/infrastructure/roster-persistence";
import type { LineupQueries, LineupWriter } from "../../application/ports";
import { Match, TournamentParticipant } from "./tournament.entities";
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

export class CompetitionLineupWriter implements LineupWriter {
  constructor(
    private readonly em: Pick<EntityManager, "count" | "nativeDelete" | "getReference" | "persist">,
  ) {}

  async activePlayersExist(ids: string[]) {
    const unique = [...new Set(ids)];

    if (unique.length === 0) return true;

    return (
      (await this.em.count(Player, { id: { $in: unique }, mergedInto: null })) === unique.length
    );
  }

  async replace(matchId: string, lineups: MatchLineupInput[]) {
    await this.em.nativeDelete(MatchLineupPlayer, { match: matchId });

    for (const { participantId, playerIds } of lineups) {
      playerIds.forEach((playerId, position) => {
        const row = new MatchLineupPlayer();
        row.id = crypto.randomUUID();
        row.match = this.em.getReference(Match, matchId);
        row.participant = this.em.getReference(TournamentParticipant, participantId);
        row.player = this.em.getReference(Player, playerId);
        row.position = position;
        this.em.persist(row);
      });
    }
  }
}
