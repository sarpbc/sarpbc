import type { EntityManager } from "@mikro-orm/postgresql";
import { Post, PostTranslation, Topic } from "./forum.entities";
import { User } from "../../../user/infrastructure/persistence/user.entity";
import { PostRepository } from "./post.repository";
import { TopicRepository } from "./topic.repository";
import { postSnapshot, topicSnapshot } from "./forum.mapper";
import type { PostRecord, TopicRecord, TranslationRecord } from "../../domain/forum";
import type { PostStore, TopicStore } from "../../application/ports";
export class MikroPostStore implements PostStore {
  private readonly rows: PostRepository;
  constructor(private readonly em: EntityManager) {
    this.rows = em.getRepository<Post, PostRepository>(Post);
  }
  async findPaginated(options: { limit?: number; offset?: number }) {
    return (await this.rows.findPaginated(options)).map(postSnapshot);
  }
  async findByTopicId(id: string) {
    return (await this.rows.findByTopicId(id)).map(postSnapshot);
  }
  async findById(id: string) {
    const row = await this.rows.findById(id);
    return row ? postSnapshot(row) : null;
  }
  async findWithDetails(id: string) {
    const row = await this.rows.findWithDetails(id);
    return row ? postSnapshot(row) : null;
  }
  async findLatestByUser(id: string) {
    const row = await this.rows.findLatestByUser(id);
    return row ? postSnapshot(row) : null;
  }
  findRecentActivity(limit: number) {
    return this.rows.findRecentActivity(limit);
  }
  async save(model: PostRecord) {
    const row = (await this.rows.findById(model.id)) ?? new Post();
    row.id = model.id;
    row.title = model.title;
    row.content = model.content;
    row.postType = model.postType;
    row.createdAt = model.createdAt;
    row.updatedAt = model.updatedAt;
    row.author = this.em.getReference(User, model.author.id);
    row.topic = this.em.getReference(Topic, model.topic.id);
    this.em.persist(row);
  }
  async saveTranslation(model: TranslationRecord) {
    const row = new PostTranslation();
    row.id = model.id;
    row.post = this.em.getReference(Post, model.post.id);
    row.locale = model.locale;
    row.title = model.title;
    row.content = model.content;
    row.createdAt = model.createdAt;
    row.updatedAt = model.updatedAt;
    this.em.persist(row);
  }
  async deleteTranslations(post: PostRecord) {
    const rows = await this.em.find(PostTranslation, { post: { id: post.id } });
    this.em.remove(rows);
  }
  async delete(post: PostRecord) {
    const row = await this.rows.findById(post.id);
    if (row) this.em.remove(row);
  }
}
export class MikroTopicStore implements TopicStore {
  private readonly rows: TopicRepository;
  constructor(private readonly em: EntityManager) {
    this.rows = em.getRepository<Topic, TopicRepository>(Topic);
  }
  async findAllTopics() {
    return (await this.rows.findAllTopics()).map(topicSnapshot);
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
