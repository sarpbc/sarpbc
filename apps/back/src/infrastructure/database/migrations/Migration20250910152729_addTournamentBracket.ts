import { Migration } from "@mikro-orm/migrations";

export class Migration20250910152729_addTournamentBracket extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "bracket_link" ("id" varchar(255) not null, "match_id" varchar(255) not null, "previous_match_id" varchar(255) not null, "type" varchar(255) not null, constraint "bracket_link_pkey" primary key ("id"));`,
    );

    this.addSql(
      `alter table "bracket_link" add constraint "bracket_link_match_id_foreign" foreign key ("match_id") references "match" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "bracket_link" add constraint "bracket_link_previous_match_id_foreign" foreign key ("previous_match_id") references "match" ("id") on update cascade;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "bracket_link" cascade;`);
  }
}
