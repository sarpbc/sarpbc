import { Entity, PrimaryKey, Property, ManyToOne } from "@mikro-orm/core";
import { v4 } from "uuid";
import { Match } from "./match.entity";

@Entity()
export class BracketLink {
  @PrimaryKey()
  id: string = v4();

  @ManyToOne(() => Match)
  match!: Match;

  @ManyToOne(() => Match)
  previousMatch!: Match;

  @Property()
  type!: "winner" | "loser";
}
