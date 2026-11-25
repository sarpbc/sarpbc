import { Migration } from "@mikro-orm/migrations";

export class Migration20261125120000_addTournamentSourceUrl extends Migration {
  override name = "Migration20261125120000_addTournamentSourceUrl";

  override up() {
    this.addSql(`alter table "tournament" add column "source_url" text null;`);
  }

  override down() {
    this.addSql(`alter table "tournament" drop column "source_url";`);
  }
}
