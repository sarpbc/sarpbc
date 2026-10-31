import { Collection, defineEntity, p } from "@mikro-orm/core";
import { Player, Team } from "../../../roster/infrastructure/roster-persistence";
import { Tournament } from "./tournament.entities";

export class TournamentPrize {
  id!: string;
  tournament!: Tournament;
  placement!: number;
  amount!: number;
  currency!: string;
  team!: Team;
  players = new Collection<Player>(this);
  createdAt = new Date();
}

export const TournamentPrizeSchema = defineEntity({
  class: TournamentPrize,
  uniques: [{ properties: ["tournament", "team"] }],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    tournament: p.manyToOne(Tournament),
    placement: p.integer(),
    amount: p.integer(),
    currency: p.text(),
    team: p.manyToOne(Team),
    players: p.manyToMany(Player),
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
  },
});
