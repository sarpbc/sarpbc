import { Controller, Get } from "@nestjs/common";
import { TopicService } from "./topic/topic.service";
import { PostService } from "./post/post.service";

@Controller("forum")
export class ForumController {
  constructor(
    private topicService: TopicService,
    private postService: PostService,
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
}
