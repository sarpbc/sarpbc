import { Entity, PrimaryKey, Property, ManyToOne } from "@mikro-orm/core";
import { v4 } from "uuid";
import { User } from "../../../user/domain/user.entity";
import { TournamentParticipant } from "../../../tournament/domain/tournament-participant.entity";
import { PickemRepository } from "../pickem.repository";
import { Match } from "src/tournament/match/match.entity";

@Entity({ repository: () => PickemRepository })
export class PickemChoice {
  @PrimaryKey()
  id: string = v4();

  @ManyToOne(() => User)
  user!: User;

  @ManyToOne(() => Match)
  match!: Match;

  @ManyToOne(() => TournamentParticipant)
  pickedParticipant!: TournamentParticipant;

  @Property({ nullable: true })
  points?: number;

  @Property({ type: "boolean", default: "false" })
  scored = false;

  @Property({ type: "date" })
  createdAt: Date = new Date();
}
