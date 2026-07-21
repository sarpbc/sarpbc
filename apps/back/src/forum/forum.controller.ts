import { Controller, Get, Post, Body, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { TopicService } from "./topic/topic.service";
import { PostService } from "./post/post.service";
import { ReplyService } from "../reply/reply.service";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUserId } from "../user/decorator/current-user.decorator";
import { CreateReplyDto } from "../reply/dto/create-reply.dto";

@Controller("forum")
export class ForumController {
  constructor(
    private topicService: TopicService,
    private postService: PostService,
    private replyService: ReplyService,
  ) {}

  @Get()
  async getOverview() {
    const topics = await this.topicService.find();
    return {
      totalTopics: topics.length,
      topics: topics.map((topic) => ({
        id: topic.id,
        title: topic.title,
        description: topic.description,
        createdAt: topic.createdAt,
        postsCount: topic.posts.length,
      })),
    };
  }

  @Get("preview")
  async getPreview() {
    const recentPosts = await this.postService.findRecentActivity(20);
    return {
      recentPosts,
    };
  }

  @UseGuards(AuthGuard)
  @Post("replies")
  @HttpCode(HttpStatus.NO_CONTENT)
  async createReply(@CurrentUserId() userId: string, @Body() createReplyDto: CreateReplyDto) {
    await this.replyService.create(userId, createReplyDto);
  }
}
