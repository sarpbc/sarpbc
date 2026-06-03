import { Migration } from "@mikro-orm/migrations";

export class Migration20250828093236_addImageUrl extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "team" add column "image_url" varchar(255) null;`);

    this.addSql(`alter table "player" add column "image_url" varchar(255) null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "team" drop column "image_url";`);

    this.addSql(`alter table "player" drop column "image_url";`);
  }
}
