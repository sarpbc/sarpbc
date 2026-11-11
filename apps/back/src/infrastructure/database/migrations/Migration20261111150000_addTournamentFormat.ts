import { Migration } from "@mikro-orm/migrations";

export class Migration20261111150000_addTournamentFormat extends Migration {
  override name = "Migration20261111150000_addTournamentFormat";

  override up(): void | Promise<void> {
    this.addSql(
      `alter table "tournament" add column "format" varchar(255) not null default '3v3';`,
    );
    this.addSql(`alter table "tournament_participant" alter column "team_id" drop not null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`delete from "tournament_participant" where "team_id" is null;`);
    this.addSql(`alter table "tournament_participant" alter column "team_id" set not null;`);
    this.addSql(`alter table "tournament" drop column "format";`);
  }
}
