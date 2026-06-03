import {
  Collection,
  Entity,
  Enum,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
} from "@mikro-orm/postgresql";
import { PostType } from "../post-type.enum";
import { PostRepository } from "../post.repository";
import { Topic } from "../../topic/domain/topic.entity";
import { Reply } from "../../../reply/domain/reply.entity";
import { User } from "../../../user/domain/user.entity";
import { PostTranslation } from "./post-translation.entity";

@Entity({ repository: () => PostRepository })
export class Post {
  @PrimaryKey({ type: "uuid", defaultRaw: "gen_random_uuid()" })
  id!: string;

  @Property()
  title!: string;

  @Property({ type: "text" })
  content!: string;

  @OneToMany(() => PostTranslation, (t) => t.post)
  translations = new Collection<PostTranslation>(this);

  @ManyToOne(() => Topic)
  topic!: Topic;

  @ManyToOne(() => User)
  author!: User;

  @Enum({ items: () => PostType, default: PostType.DISCUSSION })
  postType: PostType = PostType.DISCUSSION;

  @OneToMany(() => Reply, (reply) => reply.post)
  replies = new Collection<Reply>(this);

  @Property({ type: "datetime", onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ type: "datetime", onUpdate: () => new Date(), nullable: true })
  updatedAt?: Date;
}
