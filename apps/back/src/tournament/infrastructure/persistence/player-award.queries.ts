import { EntityManager } from "@mikro-orm/postgresql";
import type { PlayerAwardType, PlayerProfileAward, TournamentAwardListItem } from "@sarpbc/types";
import type { AwardQueries } from "../../application/ports";
import { Player } from "../../../roster/infrastructure/roster-persistence";
import { Tournament } from "./tournament.entity";
import { PlayerAward } from "./player-award.entities";
import { toEventRef } from "../../domain/tournament-event";

export const AWARD_LABELS = {
  breakthrough_player: "Breakthrough Player",
  defensive_mvp: "Defensive MVP",
  grand_finals_mvp: "Grand Finals MVP",
  mvp: "MVP",
  offensive_mvp: "Offensive MVP",
} as const satisfies Record<PlayerAwardType, string>;

export const toTournamentItem = (row: PlayerAward) =>
  ({
    awardType: row.awardType,
    id: row.id,
    participant: {
      id: row.participant.id,
      team: row.participant.team
        ? { id: row.participant.team.id, name: row.participant.team.name }
        : undefined,
    },
    player: { id: row.player.id, name: row.player.name, slug: row.player.slug },
  }) satisfies TournamentAwardListItem;

export class CompetitionAwardQueries implements AwardQueries {
  constructor(private readonly em: EntityManager) {}
  async byPlayer(id: string) {
    if (!(await this.em.findOne(Player, { id }))) {
      return null satisfies PlayerProfileAward[] | null;
    }

    const rows = await this.em.find(
      PlayerAward,
      { player: { id } },
      { orderBy: { tournament: { endAt: "DESC" } }, populate: ["tournament.event"] },
    );

    return rows.map((row) => ({
      awardType: row.awardType,
      id: row.id,
      tournament: {
        endAt: row.tournament.endAt,
        event: toEventRef(row.tournament.event),
        id: row.tournament.id,
        name: row.tournament.name,
        slug: row.tournament.slug,
      },
    })) satisfies PlayerProfileAward[] | null;
  }
  async byTournament(id: string) {
    if (!(await this.em.findOne(Tournament, { id }))) {
      return null satisfies TournamentAwardListItem[] | null;
    }

    const rows = await this.em.find(
      PlayerAward,
      { tournament: { id } },
      { orderBy: { createdAt: "ASC" }, populate: ["player", "participant.team"] },
    );

    return rows.map(toTournamentItem) satisfies TournamentAwardListItem[] | null;
  }
}
