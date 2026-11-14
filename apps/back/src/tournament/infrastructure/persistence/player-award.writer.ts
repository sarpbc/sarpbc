import { EntityManager } from "@mikro-orm/postgresql";
import type { PlayerAwardType, TournamentAwardListItem } from "@sarpbc/types";
import { participantName } from "@sarpbc/utils";
import { ConflictError } from "../../../common/domain/errors/conflict-error";
import { isUniqueViolation } from "../../../common/infrastructure/persistence/constraint-violation";
import type { AwardParticipantRef, AwardWriter } from "../../application/ports";
import { Player } from "../../../roster/infrastructure/roster-persistence";
import { Tournament } from "./tournament.entity";
import { TournamentParticipant } from "./tournament-participant.entity";
import { PlayerAward } from "./player-award.entities";
import { AWARD_LABELS, toTournamentItem } from "./player-award.queries";

export class CompetitionAwardWriter implements AwardWriter {
  constructor(private readonly em: EntityManager) {}
  async context(tournamentId: string, participant: AwardParticipantRef, playerId: string) {
    const [t, p, player] = await Promise.all([
      this.em.findOne(Tournament, { id: tournamentId }),
      this.em.findOne(
        TournamentParticipant,
        {
          ...("participantId" in participant
            ? { id: participant.participantId }
            : { team: { id: participant.teamId } }),
          tournament: { id: tournamentId },
        },
        { populate: ["players", "team"] },
      ),
      this.em.findOne(Player, { id: playerId }),
    ]);

    return {
      tournament: t ? { id: t.id, name: t.name, source: t.source } : null,
      participant: p
        ? {
            id: p.id,
            name: participantName({ team: p.team, players: p.players.getItems() }),
            playerIds: p.players.getItems().map((r) => r.id),
          }
        : null,
      player: player ? { id: player.id, name: player.name, slug: player.slug } : null,
    };
  }
  async awardTaken(tournamentId: string, awardType: PlayerAwardType) {
    return (await this.em.count(PlayerAward, { tournament: { id: tournamentId }, awardType })) > 0;
  }

  async create(input: {
    tournamentId: string;
    participantId: string;
    playerId: string;
    awardType: PlayerAwardType;
  }): Promise<TournamentAwardListItem> {
    const row = new PlayerAward();
    row.id = crypto.randomUUID();
    row.tournament = this.em.getReference(Tournament, input.tournamentId);
    row.participant = await this.em.findOneOrFail(
      TournamentParticipant,
      { id: input.participantId },
      { populate: ["team"] },
    );
    row.player = await this.em.findOneOrFail(Player, { id: input.playerId });
    row.awardType = input.awardType;
    this.em.persist(row);

    try {
      await this.em.flush();
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError(
          `${row.tournament.name} already has a ${
            AWARD_LABELS[input.awardType]
          } award. Remove the current award before assigning another player.`,
        );
      }

      throw error;
    }

    return toTournamentItem(row);
  }
  async remove(tournamentId: string, id: string) {
    const row = await this.em.findOne(PlayerAward, { id, tournament: { id: tournamentId } });

    if (!row) {
      return false;
    }

    this.em.remove(row);

    return true;
  }
}
