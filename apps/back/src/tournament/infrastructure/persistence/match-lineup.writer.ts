import { EntityManager } from "@mikro-orm/postgresql";
import type { MatchLineupInput } from "@sarpbc/types";
import { Player } from "../../../roster/infrastructure/roster-persistence";
import type { LineupWriter } from "../../application/ports";
import { Match } from "./match.entity";
import { TournamentParticipant } from "./tournament-participant.entity";
import { MatchLineupPlayer } from "./match-lineup.entities";

export class CompetitionLineupWriter implements LineupWriter {
  constructor(
    private readonly em: Pick<EntityManager, "count" | "nativeDelete" | "getReference" | "persist">,
  ) {}

  async activePlayersExist(ids: string[]) {
    const unique = [...new Set(ids)];

    if (unique.length === 0) {
      return true;
    }

    return (
      (await this.em.count(Player, { id: { $in: unique }, mergedInto: null })) === unique.length
    );
  }

  async replace(matchId: string, lineups: MatchLineupInput[]) {
    await this.em.nativeDelete(MatchLineupPlayer, { match: matchId });

    const rows = lineups.flatMap(({ participantId, playerIds }) =>
      playerIds.map((playerId, position) => {
        const row = new MatchLineupPlayer();
        row.id = crypto.randomUUID();
        row.match = this.em.getReference(Match, matchId);
        row.participant = this.em.getReference(TournamentParticipant, participantId);
        row.player = this.em.getReference(Player, playerId);
        row.position = position;

        return row;
      }),
    );

    this.em.persist(rows);
  }
}
