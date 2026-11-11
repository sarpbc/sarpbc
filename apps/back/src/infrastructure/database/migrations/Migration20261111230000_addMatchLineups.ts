import { Migration } from "@mikro-orm/migrations";

export class Migration20261111230000_addMatchLineups extends Migration {
  override name = "Migration20261111230000_addMatchLineups";

  override up(): void | Promise<void> {
    this.addSql(
      `create table "match_lineup_player" ("id" uuid not null default gen_random_uuid(), "match_id" varchar(255) not null, "participant_id" varchar(255) not null, "player_id" uuid not null, "position" int not null, primary key ("id"));`,
    );
    this.addSql(
      `create index "match_lineup_player_player_id_index" on "match_lineup_player" ("player_id");`,
    );
    this.addSql(
      `alter table "match_lineup_player" add constraint "match_lineup_player_match_id_player_id_unique" unique ("match_id", "player_id");`,
    );

    this.addSql(
      `alter table "match_lineup_player" add constraint "match_lineup_player_match_id_foreign" foreign key ("match_id") references "match" ("id") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "match_lineup_player" add constraint "match_lineup_player_participant_id_foreign" foreign key ("participant_id") references "tournament_participant" ("id") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "match_lineup_player" add constraint "match_lineup_player_player_id_foreign" foreign key ("player_id") references "player" ("id") on update cascade on delete cascade;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "match_lineup_player" cascade;`);
  }
}
