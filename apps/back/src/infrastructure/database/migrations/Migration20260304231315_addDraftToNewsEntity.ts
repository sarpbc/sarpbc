import { Migration } from "@mikro-orm/migrations";

export class Migration20260304231315_addDraftToNewsEntity extends Migration {
  override async up() {
    this.addSql(`alter table "news_article" add column "is_draft" boolean not null default true;`);
  }

  override async down() {
    this.addSql(`alter table "news_article" drop column "is_draft";`);
  }
}
