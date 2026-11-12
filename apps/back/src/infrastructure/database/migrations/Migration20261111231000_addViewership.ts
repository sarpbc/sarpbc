import { Migration } from "@mikro-orm/migrations";

export class Migration20261111231000_addViewership extends Migration {
  override name = "Migration20261111231000_addViewership";

  override up(): void | Promise<void> {
    this.addSql(`alter table "tournament_event" add column "viewership" jsonb null;`);
    this.addSql(`alter table "match" add column "viewership" jsonb null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "match" drop column "viewership";`);
    this.addSql(`alter table "tournament_event" drop column "viewership";`);
  }
}
