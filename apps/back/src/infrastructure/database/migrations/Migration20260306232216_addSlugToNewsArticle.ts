import { Migration } from "@mikro-orm/migrations";

export class Migration20260306232216_addSlugToNewsArticle extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "news_article" add column "slug" varchar(255) not null;`);
    this.addSql(
      `alter table "news_article" add constraint "news_article_slug_unique" unique ("slug");`,
    );
    this.addSql(`create index "news_article_title_index" on "news_article" ("title");`);
    this.addSql(`create index "news_article_author_id_index" on "news_article" ("author_id");`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "news_article" drop constraint "news_article_slug_unique";`);
    this.addSql(`drop index "news_article_title_index";`);
    this.addSql(`drop index "news_article_author_id_index";`);
    this.addSql(`alter table "news_article" drop column "slug";`);
  }
}
