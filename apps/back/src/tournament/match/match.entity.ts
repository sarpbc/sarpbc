import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  ManyToMany,
  Collection,
  OneToMany,
} from "@mikro-orm/core";
import { v4 } from "uuid";
import { Tournament } from "../domain/tournament.entity";
import { TournamentParticipant } from "../domain/tournament-participant.entity";
import { MatchRepository } from "./match.repository";
import { BracketLink } from "./bracket-link.entity";
import { MatchResult } from "./match-result.entity";

@Entity({ repository: () => MatchRepository })
export class Match {
  @PrimaryKey()
  id: string = v4();

  @Property({ unique: true, nullable: true })
  pandascoreId?: number;

  @Property()
  name!: string;

  @Property({ nullable: true })
  slug?: string;

  @Property({ type: "datetime", nullable: true })
  beginAt?: Date;

  @Property({ type: "datetime", nullable: true })
  endAt?: Date;

  @Property({ nullable: true })
  status?: string;

  @ManyToMany(() => TournamentParticipant)
  participants = new Collection<TournamentParticipant>(this);

  @ManyToOne(() => TournamentParticipant, { nullable: true })
  winner?: TournamentParticipant;

  @Property({ nullable: true })
  numberOfGames?: number;

  @OneToMany(() => BracketLink, (bl) => bl.match)
  previousMatches = new Collection<BracketLink>(this);

  @OneToMany(() => MatchResult, (mr) => mr.match)
  results = new Collection<MatchResult>(this);

  @Property({ type: "datetime" })
  createdAt: Date = new Date();

  @Property({ type: "datetime", onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  @ManyToOne(() => Tournament)
  tournament!: Tournament;
}
