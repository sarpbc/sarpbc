import type { EntityManager } from "@mikro-orm/postgresql";
import { Topic } from "./topic.entity";
import type { TopicRepository } from "./topic.repository";
import { topicSnapshot } from "./forum.mapper";
import type { TopicRecord } from "../../application/models";
import type { TopicStore } from "../../application/ports";

export class MikroTopicStore implements TopicStore {
  private readonly rows: TopicRepository;
  constructor(private readonly em: EntityManager) {
    this.rows = em.getRepository<Topic, TopicRepository>(Topic);
  }
  async findAllTopics() {
    const rows = await this.rows.findAllTopics();

    return rows.map(topicSnapshot);
  }
  async findById(id: string) {
    const row = await this.rows.findById(id);

    return row ? topicSnapshot(row) : null;
  }
  async findByTitle(title: string) {
    const row = await this.rows.findByTitle(title);

    return row ? topicSnapshot(row) : null;
  }
  async save(model: TopicRecord) {
    const row = new Topic();
    row.id = model.id;
    row.title = model.title;
    row.description = model.description;
    row.createdAt = model.createdAt;
    row.updatedAt = model.updatedAt;
    this.em.persist(row);
  }
}
