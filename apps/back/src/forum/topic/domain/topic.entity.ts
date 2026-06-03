import { Entity, PrimaryKey, Property, OneToMany } from "@mikro-orm/core";
import { Post } from "../../post/domain/post.entity";
import { TopicRepository } from "../topic.repository";

@Entity({ repository: () => TopicRepository })
export class Topic {
  @PrimaryKey({ type: "uuid", defaultRaw: "gen_random_uuid()" })
  id!: string;

  @Property()
  title!: string;

  @Property({ type: "text", nullable: true })
  description?: string;

  @OneToMany(() => Post, (post) => post.topic)
  posts = new Array<Post>();

  @Property({ type: "datetime", onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ type: "datetime", onUpdate: () => new Date(), nullable: true })
  updatedAt?: Date;
}
