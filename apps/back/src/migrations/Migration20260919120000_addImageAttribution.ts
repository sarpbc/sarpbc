import { Migration } from "@mikro-orm/migrations";

export class Migration20260919120000_addImageAttribution extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "image" add column "source" varchar(255) null;`);
    this.addSql(`alter table "image" add column "source_url" varchar(500) null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "image" drop column "source_url";`);
    this.addSql(`alter table "image" drop column "source";`);
  }
}
