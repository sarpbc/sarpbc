import { Entity, PrimaryKey, Property, ManyToOne, ManyToMany, Collection } from "@mikro-orm/core";
import { v4 } from "uuid";
import { Tournament } from "./tournament.entity";
import { Team } from "../../team/domain/team.entity";
import { Player } from "../../player/domain/player.entity";
import { TournamentParticipantRepository } from "../tournament-participant.repository";

@Entity({ repository: () => TournamentParticipantRepository })
export class TournamentParticipant {
  @PrimaryKey()
  id: string = v4();

  @ManyToOne(() => Tournament)
  tournament!: Tournament;

  @ManyToOne(() => Team)
  team!: Team;

  @ManyToMany(() => Player)
  players = new Collection<Player>(this);

  @Property({ type: "date" })
  createdAt: Date = new Date();

  @Property({ type: "date", onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
