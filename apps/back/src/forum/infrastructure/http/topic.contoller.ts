import { Controller, Get, Param } from "@nestjs/common";
import { TopicService } from "../../application/topic.service";
import { topicResponse } from "./forum-response";

@Controller("forum/topics")
export class TopicController {
  constructor(private readonly topicService: TopicService) {}

  @Get()
  async find() {
    const topics = await this.topicService.find();

    return { topics: topics.map(topicResponse) };
  }

  @Get(":id")
  async findById(@Param("id") id: string) {
    const topic = await this.topicService.findById(id);

    return { topic: topic && topicResponse(topic) };
  }
}
