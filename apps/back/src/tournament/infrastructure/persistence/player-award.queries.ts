import { EntityManager } from "@mikro-orm/postgresql";
import type { PlayerAwardType, PlayerProfileAward, TournamentAwardListItem } from "@sarpbc/types";
import type { AwardQueries } from "../../application/ports";
import { Player } from "../../../roster/infrastructure/roster-persistence";
import { Tournament } from "./tournament.entity";
import { PlayerAward } from "./player-award.entities";
import { toEventRef } from "../../domain/tournament-event";

export const AWARD_LABELS = {
  mvp: "MVP",
  grand_finals_mvp: "Grand Finals MVP",
  offensive_mvp: "Offensive MVP",
  defensive_mvp: "Defensive MVP",
  breakthrough_player: "Breakthrough Player",
} as const satisfies Record<PlayerAwardType, string>;

export const toTournamentItem = (row: PlayerAward): TournamentAwardListItem => ({
  id: row.id,
  awardType: row.awardType,
  player: { id: row.player.id, name: row.player.name, slug: row.player.slug },
  participant: {
    id: row.participant.id,
    team: row.participant.team
      ? { id: row.participant.team.id, name: row.participant.team.name }
      : undefined,
  },
});

export class CompetitionAwardQueries implements AwardQueries {
  constructor(private readonly em: EntityManager) {}
  async byPlayer(id: string): Promise<PlayerProfileAward[] | null> {
    if (!(await this.em.findOne(Player, { id }))) {
      return null;
    }

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
        source: row.tournament.source,
        endAt: row.tournament.endAt,
        event: toEventRef(row.tournament.event),
      },
    }));
  }
  async byTournament(id: string): Promise<TournamentAwardListItem[] | null> {
    if (!(await this.em.findOne(Tournament, { id }))) {
      return null;
    }

    const rows = await this.em.find(
      PlayerAward,
      { tournament: { id } },
      { populate: ["player", "participant.team"], orderBy: { createdAt: "ASC" } },
    );

    return rows.map(toTournamentItem);
  }
}
