import { Entity, PrimaryKey, Property, ManyToOne, Unique } from "@mikro-orm/core";
import { v4 } from "uuid";
import { Match } from "./match.entity";
import { TournamentParticipant } from "../domain/tournament-participant.entity";

@Entity()
@Unique({ properties: ["match", "participant"] })
export class MatchResult {
  @PrimaryKey()
  id: string = v4();

  @ManyToOne(() => Match)
  match!: Match;

  @ManyToOne(() => TournamentParticipant)
  participant!: TournamentParticipant;

  @Property()
  score!: number;
}
