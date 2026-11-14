import { Module } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { ReplyModule } from "../../reply/infrastructure/reply.module";
import { ForumController } from "./http/forum.controller";
import { PostController } from "./http/post.controller";
import { TopicController } from "./http/topic.contoller";
import { PostService } from "../application/post.service";
import { TopicService } from "../application/topic.service";
import { MikroPostStore } from "./persistence/post.store";
import { MikroTopicStore } from "./persistence/topic.store";
import { transactionalForum } from "./composition";
import { TopicInitializer } from "./topic-initializer";

@Module({
  imports: [ReplyModule],
  controllers: [ForumController, PostController, TopicController],
  providers: [
    {
      provide: PostService,
      useFactory: (em: EntityManager) =>
        new PostService(new MikroPostStore(em), transactionalForum(em)),
      inject: [EntityManager],
    },
    {
      provide: TopicService,
      useFactory: (em: EntityManager) =>
        new TopicService(new MikroTopicStore(em), transactionalForum(em)),
      inject: [EntityManager],
    },
    TopicInitializer,
  ],
  exports: [PostService, TopicService],
})
export class ForumModule {}
