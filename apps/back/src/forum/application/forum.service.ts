import { TopicService } from "./topic.service";

export class ForumService {
  constructor(private topicService: TopicService) {}

  async getForumStats() {
    const topics = await this.topicService.find();
    const totalTopics = topics.length;
    const totalPosts = topics.reduce((sum, topic) => sum + topic.posts.length, 0);

    return {
      totalTopics,
      totalPosts,
      recentTopics: topics
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5),
    };
  }
}
