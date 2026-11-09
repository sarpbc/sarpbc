import { EntityManager } from "@mikro-orm/postgresql";
import type { PlayerAwardType, PlayerProfileAward, TournamentAwardListItem } from "@sarpbc/types";
import { ConflictError } from "../../../common/domain/errors";
import { isUniqueViolation } from "../../../common/infrastructure/persistence/constraint-violation";
import type { AwardParticipantRef, AwardQueries, AwardWriter } from "../../application/ports";
import { Player } from "../../../roster/infrastructure/roster-persistence";
import { Tournament, TournamentParticipant } from "./tournament.entities";
import { PlayerAward } from "./player-award.entities";
import { toEventRef } from "../../domain/tournament-event";
const AWARD_LABELS = {
  mvp: "MVP",
  defensive_mvp: "Defensive MVP",
} as const satisfies Record<PlayerAwardType, string>;
function toTournamentItem(row: PlayerAward): TournamentAwardListItem {
  return {
    id: row.id,
    awardType: row.awardType,
    player: { id: row.player.id, name: row.player.name, slug: row.player.slug },
    participant: {
      id: row.participant.id,
      team: row.participant.team
        ? { id: row.participant.team.id, name: row.participant.team.name }
        : undefined,
    },
  };
}
export class CompetitionAwardQueries implements AwardQueries {
  constructor(private readonly em: EntityManager) {}
  async byPlayer(id: string): Promise<PlayerProfileAward[] | null> {
    if (!(await this.em.findOne(Player, { id }))) return null;
    const rows = await this.em.find(
      PlayerAward,
      { player: { id } },
      { populate: ["tournament.event"], orderBy: { tournament: { endAt: "DESC" } } },
    );
    return rows.map((row) => ({
      id: row.id,
      awardType: row.awardType,
      tournament: {
        id: row.tournament.id,
        name: row.tournament.name,
        slug: row.tournament.slug,
        endAt: row.tournament.endAt,
        event: toEventRef(row.tournament.event),
      },
    }));
  }
  async byTournament(id: string): Promise<TournamentAwardListItem[] | null> {
    if (!(await this.em.findOne(Tournament, { id }))) return null;
    return (
      await this.em.find(
        PlayerAward,
        { tournament: { id } },
        { populate: ["player", "participant.team"], orderBy: { createdAt: "ASC" } },
      )
    ).map(toTournamentItem);
  }
}
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
            team: { id: p.team.id, name: p.team.name },
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
      if (isUniqueViolation(error))
        throw new ConflictError(
          row.tournament.name +
            " already has a " +
            AWARD_LABELS[input.awardType] +
            " award. Remove the current award before assigning another player.",
        );
      throw error;
    }
    return toTournamentItem(row);
  }
  async remove(tournamentId: string, id: string) {
    const row = await this.em.findOne(PlayerAward, { id, tournament: { id: tournamentId } });
    if (!row) return false;
    this.em.remove(row);
    return true;
  }
}
