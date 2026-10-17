import { Migration } from "@mikro-orm/migrations";

export class Migration20260802161241_addImageUrl extends Migration {
  override up(): void | Promise<void> {
    this.addSql(`alter table "news_article" add "image_url" varchar(255) null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "news_article" drop column "image_url";`);
  }
}
