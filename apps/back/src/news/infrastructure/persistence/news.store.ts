import type { EntityManager } from "@mikro-orm/postgresql";
import type { NewsType } from "@sarpbc/types";
import { NewsArticle } from "./news-article.entity";
import { User } from "../../../user/infrastructure/persistence/user.entity";
import type { NewsArticleRecord } from "../../application/models";
import type { NewsWriteScope } from "../../application/ports";
export function newsSnapshot(row: NewsArticle): NewsArticleRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    content: row.content,
    titleFr: row.titleFr,
    contentFr: row.contentFr,
    author: { id: row.author.id, userName: row.author.userName },
    createdAt: new Date(row.createdAt),
    updatedAt: row.updatedAt ? new Date(row.updatedAt) : null,
    isDraft: row.isDraft,
    imageUrl: row.imageUrl,
    type: row.type,
  };
}
type NewsStore = NewsWriteScope["articles"];
export class MikroNewsStore implements NewsStore {
  constructor(private readonly em: EntityManager) {}
  async findBySlug(slug: string) {
    const row = await this.em.findOne(NewsArticle, { slug }, { populate: ["author"] });
    return row ? newsSnapshot(row) : null;
  }
  async findById(id: string) {
    const row = await this.em.findOne(NewsArticle, { id }, { populate: ["author"] });
    return row ? newsSnapshot(row) : null;
  }
  async listPublished(
    page: number,
    limit: number,
    type?: NewsType,
  ): Promise<[NewsArticleRecord[], number]> {
    const [rows, total] = await this.em.findAndCount(
      NewsArticle,
      type ? { isDraft: false, type } : { isDraft: false },
      { populate: ["author"], orderBy: { createdAt: "DESC" }, limit, offset: page * limit },
    );
    return [rows.map(newsSnapshot), total];
  }
  async listWeek(start: Date, end: Date, limit: number) {
    return (
      await this.em.find(
        NewsArticle,
        { isDraft: false, type: "short", createdAt: { $gte: start, $lt: end } },
        { populate: ["author"], orderBy: { createdAt: "DESC" }, limit },
      )
    ).map(newsSnapshot);
  }
  countPublished() {
    return this.em.count(NewsArticle, { isDraft: false });
  }
  async sitemapChunk(
    offset: number,
    limit: number,
  ): Promise<[import("../../application/models").NewsSitemapRecord[], number]> {
    const [rows, total] = await this.em.findAndCount(
      NewsArticle,
      { isDraft: false },
      {
        fields: ["id", "slug", "createdAt", "updatedAt"],
        orderBy: { createdAt: "ASC", id: "ASC" },
        offset,
        limit,
      },
    );
    return [
      rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        createdAt: new Date(row.createdAt),
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : null,
      })),
      total,
    ];
  }
  async listAdmin(page: number, limit: number): Promise<[NewsArticleRecord[], number]> {
    const [rows, total] = await this.em.findAndCount(
      NewsArticle,
      {},
      { populate: ["author"], orderBy: { createdAt: "DESC" }, limit, offset: page * limit },
    );
    return [rows.map(newsSnapshot), total];
  }
  async save(model: NewsArticleRecord) {
    const row = (await this.em.findOne(NewsArticle, { id: model.id })) ?? new NewsArticle();
    row.id = model.id;
    row.slug = model.slug;
    row.title = model.title;
    row.content = model.content;
    row.titleFr = model.titleFr;
    row.contentFr = model.contentFr;
    row.author = this.em.getReference(User, model.author.id);
    row.createdAt = model.createdAt;
    row.updatedAt = model.updatedAt;
    row.isDraft = model.isDraft;
    row.imageUrl = model.imageUrl;
    row.type = model.type;
    this.em.persist(row);
  }
  async delete(model: NewsArticleRecord) {
    const row = await this.em.findOne(NewsArticle, { id: model.id });
    if (row) this.em.remove(row);
  }
}
