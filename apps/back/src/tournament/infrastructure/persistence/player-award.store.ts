import { EntityManager } from "@mikro-orm/postgresql";
import type { PlayerAwardType, PlayerProfileAward, TournamentAwardListItem } from "@sarpbc/types";
import type { AwardQueries, AwardWriter } from "../../application/ports";
import { Player } from "../../../roster/infrastructure/roster-persistence";
import { Tournament, TournamentParticipant } from "./tournament.entities";
import { PlayerAward } from "./player-award.entities";
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
        event: {
          id: row.tournament.event.id,
          slug: row.tournament.event.slug,
          name: row.tournament.event.name,
        },
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
  conflictMessage =
    "This tournament already has that award. Remove the current award before assigning another player.";
  constructor(private readonly em: EntityManager) {}
  async context(tournamentId: string, participantId: string, playerId: string) {
    const [t, p, player] = await Promise.all([
      this.em.findOne(Tournament, { id: tournamentId }),
      this.em.findOne(
        TournamentParticipant,
        { id: participantId, tournament: { id: tournamentId } },
        { populate: ["players", "team"] },
      ),
      this.em.findOne(Player, { id: playerId }),
    ]);
    return {
      tournament: t ? { id: t.id, name: t.name } : null,
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
    this.conflictMessage =
      row.tournament.name +
      " already has a " +
      (input.awardType === "mvp" ? "MVP" : "Defensive MVP") +
      " award. Remove the current award before assigning another player.";
    this.em.persist(row);
    return toTournamentItem(row);
  }
  async remove(tournamentId: string, id: string) {
    const row = await this.em.findOne(PlayerAward, { id, tournament: { id: tournamentId } });
    if (!row) return false;
    this.em.remove(row);
    return true;
  }
}
