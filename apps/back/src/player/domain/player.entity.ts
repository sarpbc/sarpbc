import {
  Collection,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
} from "@mikro-orm/core";
import { PlayerRepository } from "../player.repository";
import { Team } from "../../team/domain/team.entity";
import { Contract } from "./contract.entity";
import { PlayerPhoto } from "./player-photo.entity";

@Entity({ repository: () => PlayerRepository })
@Index({ properties: ["name"] })
@Index({ properties: ["slug"] })
export class Player {
  @PrimaryKey({ type: "uuid", defaultRaw: "gen_random_uuid()" })
  id!: string;

  @Property()
  name!: string;

  @ManyToOne(() => Team, { nullable: true })
  team?: Team;

  @Property({ type: "date", nullable: true })
  birthday?: Date;

  @Property({ nullable: true })
  nationality?: string;

  @Property({ nullable: true })
  firstName?: string;

  @Property({ nullable: true })
  lastName?: string;

  @Property({ nullable: true })
  imageUrl?: string;

  @Property()
  slug!: string;

  @OneToMany(() => Contract, (contract) => contract.player)
  contracts = new Collection<Contract>(this);

  @OneToMany(() => PlayerPhoto, (photo) => photo.player)
  photos = new Collection<PlayerPhoto>(this);
}
