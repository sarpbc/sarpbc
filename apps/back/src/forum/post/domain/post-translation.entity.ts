import { Entity, PrimaryKey, Property, ManyToOne } from "@mikro-orm/postgresql";
import { Post } from "./post.entity";

@Entity()
export class PostTranslation {
  @PrimaryKey({ type: "uuid", defaultRaw: "gen_random_uuid()" })
  id!: string;

  @ManyToOne(() => Post)
  post!: Post;

  @Property()
  locale!: string;

  @Property()
  title!: string;

  @Property({ type: "text" })
  content!: string;

  @Property({ type: "datetime", onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ type: "datetime", onUpdate: () => new Date(), nullable: true })
  updatedAt?: Date;
}
