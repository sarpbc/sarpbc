import { Entity, PrimaryKey, Property } from "@mikro-orm/core";
import { AirRiddleRepository } from "../airriddle.repository";

@Entity({ repository: () => AirRiddleRepository })
export class AirRiddle {
  @PrimaryKey({ type: "uuid", defaultRaw: "gen_random_uuid()" })
  id!: string;

  @Property({ type: "string" })
  playerId!: string;

  @Property({ type: "string" })
  playerName!: string;

  @Property({ type: "date", defaultRaw: "now()" })
  createdAt!: Date;
}
