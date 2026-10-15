import { Migration } from "@mikro-orm/migrations";

export class Migration20261015101800_addTournamentCountry extends Migration {
  override name = "Migration20261015101800_addTournamentCountry";

  override up(): void | Promise<void> {
    this.addSql(`alter table "tournament" add "country" varchar(255) null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "tournament" drop column "country";`);
  }
}
