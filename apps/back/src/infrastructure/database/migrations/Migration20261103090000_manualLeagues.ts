import { Migration } from "@mikro-orm/migrations";

export class Migration20261103090000_manualLeagues extends Migration {
  override name = "Migration20261103090000_manualLeagues";

  override up(): void | Promise<void> {
    this.addSql(`alter table "league" alter column "pandascore_id" drop not null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "league" alter column "pandascore_id" set not null;`);
  }
}
