import { defineEntity, p } from "@mikro-orm/core";
import { v4 } from "uuid";
import { Match, TournamentParticipant } from "../../../tournament/tournament.entities";
import { User } from "../../../user/domain/user.entity";
import { PickemRepository } from "../pickem.repository";

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
  repository: () => PickemRepository,
  uniques: [{ properties: ["user", "match"], name: "pickem_choice_user_match_unique" }],
  properties: {
    id: p.string().primary(),
    user: p.manyToOne(User),
    match: p.manyToOne(Match),
    pickedParticipant: p.manyToOne(TournamentParticipant),
    points: p.integer().nullable(),
    scored: p.boolean().default(false),
    createdAt: p.datetime().type("timestamptz"),
  },
});
