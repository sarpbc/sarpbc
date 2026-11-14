import { defineEntity, p } from "@mikro-orm/core";
import { v4 } from "uuid";
import {
  Match,
  TournamentParticipant,
} from "../../../../tournament/infrastructure/competition-persistence";
import { User } from "../../../../user/infrastructure/user-persistence";

export class PickemChoice {
  id: string = v4();
  user!: User;
  match!: Match;
  pickedParticipant!: TournamentParticipant;
  points: number | null = null;
  scored = false;
  createdAt: Date = new Date();
}

export const PickemChoiceSchema = defineEntity({
  class: PickemChoice,
  properties: {
    createdAt: p.datetime().type("timestamptz"),
    id: p.string().primary(),
    match: p.manyToOne(Match),
    pickedParticipant: p.manyToOne(TournamentParticipant),
    points: p.integer().nullable(),
    scored: p.boolean().default(false),
    user: p.manyToOne(User),
  },
  uniques: [{ name: "pickem_choice_user_match_unique", properties: ["user", "match"] }],
});
