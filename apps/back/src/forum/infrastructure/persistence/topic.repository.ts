import { EntityRepository } from "@mikro-orm/core";

import { Topic } from "./topic.entity";

export class TopicRepository extends EntityRepository<Topic> {
  async findAllTopics(): Promise<Topic[]> {
    return await this.findAll({ populate: ["posts", "posts.author"] });
  }

  async findById(id: string): Promise<Topic | null> {
    return await this.findOne({ id }, { populate: ["posts", "posts.author"] });
  }

  async findByTitle(title: string): Promise<Topic | null> {
    return await this.findOne({ title });
  }
}
