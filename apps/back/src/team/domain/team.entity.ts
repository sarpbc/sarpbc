import { Collection, Entity, Index, OneToMany, PrimaryKey, Property } from "@mikro-orm/core";
import { TeamRepository } from "../team.repository";
import { Player } from "../../player/domain/player.entity";

@Entity({ repository: () => TeamRepository })
@Index({ properties: ["name"] })
@Index({ properties: ["slug"] })
export class Team {
  @PrimaryKey({ type: "uuid", defaultRaw: "gen_random_uuid()" })
  id!: string;

  @Property()
  name!: string;

  @OneToMany(() => Player, (player) => player.team)
  players = new Collection<Player>(this);

  @Property({ nullable: true })
  location?: string;

  @Property({ nullable: true })
  imageUrl?: string;

  @Property()
  slug!: string;

  @Property({ nullable: true })
  pandascoreId?: number;
}
