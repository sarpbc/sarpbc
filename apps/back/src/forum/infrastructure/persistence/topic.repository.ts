import { EntityRepository } from "@mikro-orm/core";

import { Topic } from "./forum.entities";

export class TopicRepository extends EntityRepository<Topic> {
  /** Always populates `posts` so callers can use `topic.posts.length` safely. */
  async findAllTopics(): Promise<Topic[]> {
    return this.findAll({ populate: ["posts", "posts.author"] });
  }

  async findById(id: string): Promise<Topic | null> {
    return this.findOne({ id }, { populate: ["posts", "posts.author"] });
  }

  async findByTitle(title: string): Promise<Topic | null> {
    return this.findOne({ title });
  }

  async save(topic: Topic): Promise<void> {
    this.em.persist(topic);
  }
}
