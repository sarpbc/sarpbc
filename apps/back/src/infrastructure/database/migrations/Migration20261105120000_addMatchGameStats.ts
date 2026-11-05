import { Migration } from "@mikro-orm/migrations";

export class Migration20261105120000_addMatchGameStats extends Migration {
  override name = "Migration20261105120000_addMatchGameStats";

  override up(): void | Promise<void> {
    this.addSql(
      `create table "match_game" ("id" uuid not null default gen_random_uuid(), "match_id" varchar(255) not null, "number" int not null, "ballchasing_id" varchar(255) not null, "rocket_league_id" varchar(255) null, "played_at" timestamptz null, "blue_participant_id" varchar(255) not null, "orange_participant_id" varchar(255) not null, "blue_goals" int not null, "orange_goals" int not null, "created_at" timestamptz not null default now(), primary key ("id"));`,
    );
    this.addSql(`create index "match_game_match_id_index" on "match_game" ("match_id");`);
    this.addSql(
      `alter table "match_game" add constraint "match_game_ballchasing_id_unique" unique ("ballchasing_id");`,
    );

    this.addSql(
      `create table "match_game_player" ("id" uuid not null default gen_random_uuid(), "game_id" uuid not null, "side" text not null, "player_id" uuid null, "name" text not null, "platform" text not null, "platform_id" text null, "goals" int not null, "assists" int not null, "saves" int not null, "shots" int not null, "demolitions" int not null, primary key ("id"));`,
    );
    this.addSql(
      `create index "match_game_player_game_id_index" on "match_game_player" ("game_id");`,
    );
    this.addSql(
      `create index "match_game_player_player_id_index" on "match_game_player" ("player_id");`,
    );

    this.addSql(
      `create table "match_stats_import" ("id" uuid not null, "tournament_id" varchar(255) not null, "group_id" text not null, "status" text not null, "total" int null, "processed" int not null default 0, "items" jsonb not null default '[]', "error" text null, "created_at" timestamptz not null, "started_at" timestamptz null, "finished_at" timestamptz null, primary key ("id"));`,
    );
    this.addSql(
      `create index "match_stats_import_tournament_id_created_at_index" on "match_stats_import" ("tournament_id", "created_at");`,
    );

    this.addSql(
      `alter table "match_game" add constraint "match_game_match_id_foreign" foreign key ("match_id") references "match" ("id") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "match_game" add constraint "match_game_blue_participant_id_foreign" foreign key ("blue_participant_id") references "tournament_participant" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "match_game" add constraint "match_game_orange_participant_id_foreign" foreign key ("orange_participant_id") references "tournament_participant" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "match_game_player" add constraint "match_game_player_game_id_foreign" foreign key ("game_id") references "match_game" ("id") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "match_game_player" add constraint "match_game_player_player_id_foreign" foreign key ("player_id") references "player" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "match_stats_import" add constraint "match_stats_import_tournament_id_foreign" foreign key ("tournament_id") references "tournament" ("id") on update cascade on delete cascade;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "match_game_player" cascade;`);
    this.addSql(`drop table if exists "match_game" cascade;`);
    this.addSql(`drop table if exists "match_stats_import" cascade;`);
  }
}
