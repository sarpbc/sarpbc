import { Migration } from "@mikro-orm/migrations";

export class Migration20260906153000_addNewsArticleType extends Migration {
  override name = "Migration20260906153000_addNewsArticleType";

  override up(): void | Promise<void> {
    this.addSql(`alter table "news_article" add "type" text not null default 'short';`);
    this.addSql(
      `alter table "news_article" add constraint "news_article_type_check" check ("type" in ('short', 'article'));`,
    );
    this.addSql(`create index "news_article_type_index" on "news_article" ("type");`);
    this.addSql(
      `update "news_article" set "type" = 'article' where "slug" in ('worlds-2026-community-bundle');`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "news_article" drop constraint if exists "news_article_type_check";`);
    this.addSql(`drop index if exists "news_article_type_index";`);
    this.addSql(`alter table "news_article" drop column "type";`);
  }
}
