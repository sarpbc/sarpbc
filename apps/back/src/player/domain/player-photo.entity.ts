import { Entity, ManyToOne, PrimaryKey, Property } from "@mikro-orm/core";
import { PlayerPhotoRepository } from "../player-photo.repository";
import { Player } from "./player.entity";

@Entity({ repository: () => PlayerPhotoRepository })
export class PlayerPhoto {
  @PrimaryKey({ type: "uuid", defaultRaw: "gen_random_uuid()" })
  id!: string;

  @ManyToOne(() => Player)
  player!: Player;

  @Property()
  url!: string;

  @Property({ type: "Date", defaultRaw: "now()" })
  createdAt = new Date();
}
