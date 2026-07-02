import { MikroORM } from "@mikro-orm/postgresql";
import { Injectable, OnModuleInit } from "@nestjs/common";
import { CreateRequestContext } from "@mikro-orm/decorators/legacy";
import { TopicRepository } from "./topic.repository";
import { Topic } from "../forum.entities";

const predefinedTopics = [
  {
    title: "Rocket League",
    description: "General discussions about Rocket League updates, esports & events",
  },
  {
    title: "Hardware & Stuff",
    description: "Discussions about hardware, peripherals, and other gaming-related topics",
  },
  {
    title: "Offtopic",
    description: "Discussions about off-topic subjects not related to Rocket League",
  },
  {
    title: "Bug & Suggestion",
    description: "Report bugs and suggest improvements for the SARPBC platform",
  },
];

@Injectable()
export class TopicService implements OnModuleInit {
  constructor(
    private readonly topicRepository: TopicRepository,
    // MikroORM is required for @CreateRequestContext() on lifecycle hook
    private readonly orm: MikroORM,
  ) {}

  @CreateRequestContext()
  async onModuleInit(): Promise<void> {
    await this.initializeTopics();
  }

  private async initializeTopics(): Promise<void> {
    for (const topicData of predefinedTopics) {
      const exists = await this.topicRepository.findByTitle(topicData.title);
      if (!exists) {
        const topic = new Topic();
        topic.title = topicData.title;
        topic.description = topicData.description;
        await this.topicRepository.save(topic);
      }
    }
  }

  async find(): Promise<Topic[]> {
    return this.topicRepository.findAllTopics();
  }

  async findById(id: string): Promise<Topic | null> {
    return this.topicRepository.findById(id);
  }
}
