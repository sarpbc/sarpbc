import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Post, PostTranslation, Topic } from "./forum.entities";
import { ForumController } from "./forum.controller";
import { TopicController } from "./topic/topic.contoller";
import { PostController } from "./post/post.controller";
import { ForumService } from "./forum.service";
import { TopicService } from "./topic/topic.service";
import { PostService } from "./post/post.service";
import { PostRepository } from "./post/post.repository";
import { TopicRepository } from "./topic/topic.repository";
import { POST_REPOSITORY } from "./post/domain/post.repository.interface";
import { TOPIC_REPOSITORY } from "./topic/domain/topic.repository.interface";
import { UserModule } from "src/user/user.module";
import { ReplyModule } from "src/reply/reply.module";

@Module({
  imports: [MikroOrmModule.forFeature([Post, PostTranslation, Topic]), UserModule, ReplyModule],
  controllers: [ForumController, TopicController, PostController],
  providers: [
    ForumService,
    TopicService,
    PostService,
    {
      provide: POST_REPOSITORY,
      useExisting: PostRepository,
    },
    {
      provide: TOPIC_REPOSITORY,
      useExisting: TopicRepository,
    },
  ],
  exports: [ForumService, TopicService, PostService, POST_REPOSITORY, TOPIC_REPOSITORY],
})
export class ForumModule {}
