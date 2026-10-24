import { Migration } from "@mikro-orm/migrations";

export class Migration20261024170000_addTournamentEndAtCorrected extends Migration {
  override name = "Migration20261024170000_addTournamentEndAtCorrected";

  override up(): void | Promise<void> {
    this.addSql(
      `alter table "tournament" add column "end_at_corrected" boolean not null default false;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "tournament" drop column "end_at_corrected";`);
  }
}
