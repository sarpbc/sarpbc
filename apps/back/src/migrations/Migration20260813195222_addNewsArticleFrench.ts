import { Migration } from "@mikro-orm/migrations";

export class Migration20260813195222_addNewsArticleFrench extends Migration {
  override name = "Migration20260813195222_addNewsArticleFrench";

  override up(): void | Promise<void> {
    this.addSql(
      `alter table "news_article" add "title_fr" varchar(255) null, add "content_fr" text null;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "news_article" drop column "title_fr", drop column "content_fr";`);
  }
}
