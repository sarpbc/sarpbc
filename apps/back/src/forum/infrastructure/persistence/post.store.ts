import type { EntityManager } from "@mikro-orm/postgresql";
import { Post } from "./post.entity";
import { PostTranslation } from "./post-translation.entity";
import { Topic } from "./topic.entity";
import { User } from "../../../user/infrastructure/user-persistence";
import type { PostRepository } from "./post.repository";
import { postSnapshot } from "./forum.mapper";
import type { EntityRef } from "../../../common/domain/entity-ref";
import type { NewPostRecord, PostRecord, TranslationRecord } from "../../application/models";
import type { PostStore } from "../../application/ports";

export class MikroPostStore implements PostStore {
  private readonly rows: PostRepository;
  constructor(private readonly em: EntityManager) {
    this.rows = em.getRepository<Post, PostRepository>(Post);
  }
  async findPaginated(options: { limit?: number; offset?: number }) {
    const rows = await this.rows.findPaginated(options);

    return rows.map(postSnapshot);
  }
  async findByTopicId(id: string) {
    const rows = await this.rows.findByTopicId(id);

    return rows.map(postSnapshot);
  }
  async findById(id: string) {
    const row = await this.rows.findById(id);

    return row ? postSnapshot(row) : null;
  }
  async findWithDetails(ref: EntityRef) {
    const row = await this.rows.findWithDetails(ref);

    return row ? postSnapshot(row) : null;
  }
  async findLatestByUser(id: string) {
    const row = await this.rows.findLatestByUser(id);

    return row ? postSnapshot(row) : null;
  }
  async findRecentActivity(limit: number) {
    return await this.rows.findRecentActivity(limit);
  }
  async save(model: NewPostRecord) {
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
    const rows = await this.em.findAll(PostTranslation, { where: { post: { id: post.id } } });
    this.em.remove(rows);
  }
  async delete(post: PostRecord) {
    const row = await this.rows.findById(post.id);

    if (row) {
      this.em.remove(row);
    }
  }
}
