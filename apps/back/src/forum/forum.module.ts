import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Post } from "./post/domain/post.entity";
import { PostTranslation } from "./post/domain/post-translation.entity";
import { Topic } from "./topic/domain/topic.entity";
import { ForumController } from "./forum.controller";
import { TopicController } from "./topic/topic.contoller";
import { PostController } from "./post/post.controller";
import { ForumService } from "./forum.service";
import { TopicService } from "./topic/topic.service";
import { PostService } from "./post/post.service";
import { UserModule } from "src/user/user.module";
import { ReplyModule } from "src/reply/reply.module";

@Module({
  imports: [MikroOrmModule.forFeature([Post, PostTranslation, Topic]), UserModule, ReplyModule],
  controllers: [ForumController, TopicController, PostController],
  providers: [ForumService, TopicService, PostService],
  exports: [ForumService, TopicService, PostService],
})
export class ForumModule {}
