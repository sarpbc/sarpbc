import { Injectable, Module, OnModuleInit } from "@nestjs/common";
import { EntityManager, MikroORM } from "@mikro-orm/postgresql";
import { CreateRequestContext } from "@mikro-orm/decorators/legacy";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Post, PostTranslation, Topic } from "./persistence/forum.entities";
import { UserModule } from "../../user/infrastructure/user.module";
import { ReplyModule } from "../../reply/infrastructure/reply.module";
import { ForumController } from "./http/forum.controller";
import { PostController } from "./http/post.controller";
import { TopicController } from "./http/topic.contoller";
import { ForumService } from "../application/forum.service";
import { PostService } from "../application/post.service";
import { TopicService } from "../application/topic.service";
import { MikroPostStore, MikroTopicStore } from "./persistence/forum.store";
import { transactionalForum } from "./composition";
@Injectable()
class TopicInitializer implements OnModuleInit {
  constructor(
    private readonly topics: TopicService,
    private readonly orm: MikroORM,
  ) {}
  @CreateRequestContext()
  async onModuleInit() {
    await this.topics.initializeTopics();
  }
}
@Module({
  imports: [MikroOrmModule.forFeature([Post, PostTranslation, Topic]), UserModule, ReplyModule],
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
    {
      provide: ForumService,
      useFactory: (topics: TopicService) => new ForumService(topics),
      inject: [TopicService],
    },
    TopicInitializer,
  ],
  exports: [ForumService, PostService, TopicService],
})
export class ForumModule {}
