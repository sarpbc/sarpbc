import { Migration } from "@mikro-orm/migrations";

export class Migration20261030120000_addMatchVods extends Migration {
  override name = "Migration20261030120000_addMatchVods";

  override up(): void | Promise<void> {
    this.addSql(`alter table "match" add column "vods" jsonb not null default '[]';`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "match" drop column "vods";`);
  }
}
