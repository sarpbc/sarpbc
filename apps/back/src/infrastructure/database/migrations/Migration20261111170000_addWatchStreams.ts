import { Migration } from "@mikro-orm/migrations";

export class Migration20261111170000_addWatchStreams extends Migration {
  override name = "Migration20261111170000_addWatchStreams";

  override up() {
    this.addSql(`alter table "tournament_event" add column "streams" jsonb not null default '[]';`);
    this.addSql(`alter table "tournament" add column "streams" jsonb not null default '[]';`);
    this.addSql(`alter table "match" add column "streams" jsonb not null default '[]';`);
  }

  override down() {
    this.addSql(`alter table "match" drop column "streams";`);
    this.addSql(`alter table "tournament" drop column "streams";`);
    this.addSql(`alter table "tournament_event" drop column "streams";`);
  }
}
