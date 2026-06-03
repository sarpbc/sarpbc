import { Controller, Get, Param } from "@nestjs/common";
import { TopicService } from "./topic.service";

@Controller("forum/topics")
export class TopicController {
  constructor(private topicService: TopicService) {}

  @Get()
  async find() {
    const topics = await this.topicService.find();
    return { topics };
  }

  @Get(":id")
  async findById(@Param("id") id: string) {
    const topic = await this.topicService.findById(id);
    return { topic };
  }
}
