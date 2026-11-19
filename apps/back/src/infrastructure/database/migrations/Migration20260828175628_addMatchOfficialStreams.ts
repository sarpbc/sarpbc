import { Migration } from "@mikro-orm/migrations";

export class Migration20260828175628_addMatchOfficialStreams extends Migration {
  override name = "Migration20260828175628_addMatchOfficialStreams";

  override up() {
    this.addSql(`alter table "match" add "official_streams" jsonb not null default '[]';`);
  }

  override down() {
    this.addSql(`alter table "match" drop column "official_streams";`);
  }
}
