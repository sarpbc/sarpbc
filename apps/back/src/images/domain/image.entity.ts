import { Entity, PrimaryKey, Property } from "@mikro-orm/core";
import { ImageRepository } from "../images.repository";

@Entity({ repository: () => ImageRepository })
export class Image {
  @PrimaryKey({ type: "uuid", defaultRaw: "gen_random_uuid()" })
  id!: string;

  @Property({ type: "varchar", length: 255 })
  imageId!: string;

  @Property({ type: "varchar", length: 500 })
  url!: string;

  @Property({ type: "timestamptz", onCreate: () => new Date() })
  createdAt: Date = new Date();
}
