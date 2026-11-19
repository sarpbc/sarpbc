import { Migration } from "@mikro-orm/migrations";

export class Migration20261114120000_addMatchForfeit extends Migration {
  override name = "Migration20261114120000_addMatchForfeit";

  override up() {
    this.addSql(`alter table "match" add column "forfeited_by_id" varchar(255) null;`);
    this.addSql(
      `alter table "match" add constraint "match_forfeited_by_id_foreign" foreign key ("forfeited_by_id") references "tournament_participant" ("id") on update cascade on delete set null;`,
    );
  }

  override down() {
    this.addSql(`alter table "match" drop constraint "match_forfeited_by_id_foreign";`);
    this.addSql(`alter table "match" drop column "forfeited_by_id";`);
  }
}
