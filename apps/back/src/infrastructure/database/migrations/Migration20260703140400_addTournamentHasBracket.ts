import { Migration } from "@mikro-orm/migrations";

export class Migration20260703140400_addTournamentHasBracket extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "tournament" add column "has_bracket" boolean not null default false;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "tournament" drop column "has_bracket";`);
  }
}
