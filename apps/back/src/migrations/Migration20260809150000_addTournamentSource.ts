import { Migration } from "@mikro-orm/migrations";

export class Migration20260809150000_addTournamentSource extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "tournament" add column "source" text check ("source" in ('pandascore', 'manual')) not null default 'pandascore';`,
    );
    this.addSql(`update "tournament" set "source" = 'manual' where "pandascore_id" is null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "tournament" drop column "source";`);
  }
}
