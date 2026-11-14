import { Migration } from "@mikro-orm/migrations";

export class Migration20261114010000_addDataSourceUrls extends Migration {
  override name = "Migration20261114010000_addDataSourceUrls";

  override up(): void | Promise<void> {
    this.addSql(`alter table "tournament_prize" add column "source_url" text null;`);
    this.addSql(`alter table "match" add column "source_url" text null;`);
    this.addSql(`alter table "tournament_participant" add column "roster_source_url" text null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "tournament_prize" drop column "source_url";`);
    this.addSql(`alter table "match" drop column "source_url";`);
    this.addSql(`alter table "tournament_participant" drop column "roster_source_url";`);
  }
}
