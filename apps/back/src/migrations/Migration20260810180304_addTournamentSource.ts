import { Migration } from "@mikro-orm/migrations";

export class Migration20260810180304_addTournamentSource extends Migration {
  override name = "Migration20260810180304_addTournamentSource";

  override up(): void | Promise<void> {
    this.addSql(
      `alter table "tournament" add "source" varchar(255) not null default 'pandascore';`,
    );
    this.addSql(`update "tournament" set "source" = 'manual' where "pandascore_id" is null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "tournament" drop column "source";`);
  }
}
