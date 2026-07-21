import { EntityRepository } from "@mikro-orm/core";
import { Topic } from "../forum.entities";
import { ITopicRepository } from "./domain/topic.repository.interface";

export class TopicRepository extends EntityRepository<Topic> implements ITopicRepository {
  async findAllTopics(): Promise<Topic[]> {
    return this.findAll({ populate: ["posts"] });
  }

  async findById(id: string): Promise<Topic | null> {
    return this.findOne({ id }, { populate: ["posts", "posts.author"] });
  }

  async findByTitle(title: string): Promise<Topic | null> {
    return this.findOne({ title });
  }

  async save(topic: Topic): Promise<void> {
    await this.em.persist(topic).flush();
  }
}
