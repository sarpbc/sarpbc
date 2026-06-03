import { Entity, PrimaryKey, Property, OneToMany, Collection } from "@mikro-orm/core";
import { v4 } from "uuid";
import { Tournament } from "../domain/tournament.entity";
import { LeagueRepository } from "./league.repository";

@Entity({ repository: () => LeagueRepository })
export class League {
  @PrimaryKey()
  id: string = v4();

  @Property({ unique: true })
  pandascoreId!: number;

  @Property()
  name!: string;

  @Property({ nullable: true })
  slug?: string;

  @Property({ nullable: true })
  url?: string;

  @Property({ nullable: true })
  imageUrl?: string;

  @Property({ type: "date", nullable: true })
  modifiedAt?: Date;

  @Property({ type: "date" })
  createdAt: Date = new Date();

  @Property({ type: "date", onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  @OneToMany(() => Tournament, (tournament) => tournament.league)
  tournaments = new Collection<Tournament>(this);
}
