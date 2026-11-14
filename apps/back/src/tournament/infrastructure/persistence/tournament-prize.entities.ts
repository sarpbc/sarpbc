import { Collection, defineEntity, p } from "@mikro-orm/core";
import { Player, Team } from "../../../roster/infrastructure/roster-persistence";
import { Tournament } from "./tournament.entity";

export class TournamentPrize {
  id!: string;
  tournament!: Tournament;
  placement!: number;
  amount!: number;
  currency!: string;
  team!: Team;
  players = new Collection<Player>(this);
  sourceUrl: string | null = null;
  createdAt = new Date();
}

export const TournamentPrizeSchema = defineEntity({
  class: TournamentPrize,
  properties: {
    amount: p.integer(),
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
    currency: p.text(),
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    placement: p.integer(),
    players: p.manyToMany(Player),
    sourceUrl: p.text().nullable(),
    team: p.manyToOne(Team),
    tournament: p.manyToOne(Tournament),
  },
  uniques: [{ properties: ["tournament", "team"] }],
});
