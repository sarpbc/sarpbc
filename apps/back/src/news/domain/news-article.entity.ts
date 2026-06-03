import { Entity, Index, ManyToOne, PrimaryKey, Property, Unique } from "@mikro-orm/postgresql";
import { User } from "../../user/domain/user.entity";

@Entity()
export class NewsArticle {
  @PrimaryKey({ type: "uuid", defaultRaw: "gen_random_uuid()" })
  id!: string;

  @Unique()
  @Property({ type: "varchar", length: 255 })
  slug!: string;

  @Index()
  @Property({ type: "varchar", length: 255 })
  title!: string;

  @Property({ type: "text" })
  content!: string;

  @Index()
  @ManyToOne(() => User)
  author!: User;

  @Property({ type: "datetime", onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ type: "datetime", onUpdate: () => new Date(), nullable: true })
  updatedAt?: Date;

  @Property({ type: "boolean", default: true })
  isDraft: boolean = true;
}
