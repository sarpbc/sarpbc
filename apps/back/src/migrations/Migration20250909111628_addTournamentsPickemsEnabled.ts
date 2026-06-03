import { Migration } from "@mikro-orm/migrations";

export class Migration20250909111628_addTournamentsPickemsEnabled extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "tournament" add column "pickems_enabled" boolean not null default 'false';`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "tournament" drop column "pickems_enabled";`);
  }
}
