import { Entity, PrimaryKey, Property, OneToMany, ManyToOne, Collection } from "@mikro-orm/core";
import { v4 } from "uuid";
import { Match } from "../match/match.entity";
import { TournamentParticipant } from "./tournament-participant.entity";
import { League } from "../league/league.entity";
import { TournamentRepository } from "../tournament.repository";

@Entity({ repository: () => TournamentRepository })
export class Tournament {
  @PrimaryKey()
  id: string = v4();

  @Property({ unique: true, nullable: true })
  pandascoreId?: number;

  @Property()
  name!: string;

  @Property({ nullable: true })
  description?: string;

  @Property({ nullable: true })
  slug?: string;

  @Property({ nullable: true })
  serie?: string;

  @Property({ nullable: true })
  tier?: string;

  @Property({ type: "date", nullable: true })
  beginAt?: Date;

  @Property({ type: "date", nullable: true })
  endAt?: Date;

  @ManyToOne(() => TournamentParticipant, { nullable: true })
  winner?: TournamentParticipant;

  @Property({ nullable: true })
  winnerType?: string;

  @Property({ nullable: true })
  type?: string;

  @Property({ nullable: true })
  prizepool?: string;

  @Property({ nullable: true })
  imageUrl?: string;

  @ManyToOne(() => League, { nullable: true })
  league?: League;

  @Property({ type: "boolean", default: "false" })
  pickemsEnabled: boolean = false;

  @Property({ type: "date" })
  createdAt: Date = new Date();

  @Property({ type: "date", onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  @OneToMany(() => Match, (match) => match.tournament)
  matches = new Collection<Match>(this);

  @OneToMany(() => TournamentParticipant, (participant) => participant.tournament)
  participants = new Collection<TournamentParticipant>(this);
}
