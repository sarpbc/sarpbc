import { EntityRepository } from "@mikro-orm/postgresql";
import { Topic } from "./domain/topic.entity";
import { ITopicRepository } from "./domain/topic.repository.interface";

export class TopicRepository extends EntityRepository<Topic> implements ITopicRepository {
  async findAllTopics(): Promise<Topic[]> {
    return super.findAll();
  }

  async findById(id: string): Promise<Topic | null> {
    return this.findOne({ id }, { populate: ["posts", "posts.author"] });
  }

  async findByTitle(title: string): Promise<Topic | null> {
    return this.findOne({ title });
  }

  async save(topic: Topic): Promise<void> {
    await this.em.persistAndFlush(topic);
  }
}
