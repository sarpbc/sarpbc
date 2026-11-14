import { Injectable, OnModuleInit } from "@nestjs/common";
import { MikroORM } from "@mikro-orm/postgresql";
import { CreateRequestContext } from "@mikro-orm/decorators/legacy";
import { TopicService } from "../application/topic.service";

@Injectable()
export class TopicInitializer implements OnModuleInit {
  constructor(
    private readonly topics: TopicService,
    private readonly orm: MikroORM,
  ) {}
  @CreateRequestContext()
  async onModuleInit() {
    await this.topics.initializeTopics();
  }
}
