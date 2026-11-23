import { Migration } from "@mikro-orm/migrations";

export class Migration20261123171759_addMatchGameReplays extends Migration {
  override name = "Migration20261123171759_addMatchGameReplays";

  override up() {
    this.addSql(
      `create table "match_game_replay" ("id" uuid not null default gen_random_uuid(), "ballchasing_id" varchar(255) not null, "blue_goals" int not null, "game_id" uuid not null, "orange_goals" int not null, "played_at" timestamptz null, "position" int not null, "rocket_league_id" varchar(255) null, primary key ("id"));`,
    );
    this.addSql(
      `insert into "match_game_replay" ("ballchasing_id", "blue_goals", "game_id", "orange_goals", "played_at", "position", "rocket_league_id") select "ballchasing_id", "blue_goals", "id", "orange_goals", "played_at", 1, "rocket_league_id" from "match_game";`,
    );
    this.addSql(
      `alter table "match_game_replay" add constraint "match_game_replay_ballchasing_id_unique" unique ("ballchasing_id");`,
    );
    this.addSql(
      `alter table "match_game_replay" add constraint "match_game_replay_game_id_position_unique" unique ("game_id", "position");`,
    );
    this.addSql(
      `alter table "match_game_replay" add constraint "match_game_replay_game_id_foreign" foreign key ("game_id") references "match_game" ("id") on update cascade on delete cascade;`,
    );

    this.addSql(
      `alter table "match_game_player" drop constraint "match_game_player_game_id_foreign";`,
    );
    this.addSql(`drop index "match_game_player_game_id_index";`);
    this.addSql(`alter table "match_game_player" rename column "game_id" to "replay_id";`);
    this.addSql(
      `update "match_game_player" set "replay_id" = "r"."id" from "match_game_replay" "r" where "r"."game_id" = "match_game_player"."replay_id";`,
    );
    this.addSql(
      `alter table "match_game_player" add constraint "match_game_player_replay_id_foreign" foreign key ("replay_id") references "match_game_replay" ("id") on update cascade on delete cascade;`,
    );
    this.addSql(
      `create index "match_game_player_replay_id_index" on "match_game_player" ("replay_id");`,
    );

    this.addSql(`alter table "match_game" drop constraint "match_game_ballchasing_id_unique";`);
    this.addSql(
      `alter table "match_game" drop column "ballchasing_id", drop column "blue_goals", drop column "orange_goals", drop column "played_at", drop column "rocket_league_id";`,
    );
  }

  override down() {
    this.addSql(
      `alter table "match_game" add "ballchasing_id" varchar(255) null, add "blue_goals" int null, add "orange_goals" int null, add "played_at" timestamptz(6) null, add "rocket_league_id" varchar(255) null;`,
    );
    this.addSql(
      `update "match_game" set "ballchasing_id" = "r"."ballchasing_id", "played_at" = "r"."played_at", "rocket_league_id" = "r"."rocket_league_id" from "match_game_replay" "r" where "r"."game_id" = "match_game"."id" and "r"."position" = (select min("position") from "match_game_replay" where "game_id" = "match_game"."id");`,
    );
    this.addSql(
      `update "match_game" set "blue_goals" = "s"."blue", "orange_goals" = "s"."orange" from (select "game_id", sum("blue_goals") as "blue", sum("orange_goals") as "orange" from "match_game_replay" group by "game_id") "s" where "s"."game_id" = "match_game"."id";`,
    );
    this.addSql(`delete from "match_game" where "ballchasing_id" is null;`);
    this.addSql(
      `alter table "match_game" alter column "ballchasing_id" set not null, alter column "blue_goals" set not null, alter column "orange_goals" set not null;`,
    );
    this.addSql(
      `alter table "match_game" add constraint "match_game_ballchasing_id_unique" unique ("ballchasing_id");`,
    );

    this.addSql(
      `alter table "match_game_player" drop constraint "match_game_player_replay_id_foreign";`,
    );
    this.addSql(`drop index "match_game_player_replay_id_index";`);
    this.addSql(`alter table "match_game_player" rename column "replay_id" to "game_id";`);
    this.addSql(
      `update "match_game_player" set "game_id" = "r"."game_id" from "match_game_replay" "r" where "r"."id" = "match_game_player"."game_id";`,
    );
    this.addSql(
      `alter table "match_game_player" add constraint "match_game_player_game_id_foreign" foreign key ("game_id") references "match_game" ("id") on update cascade on delete cascade;`,
    );
    this.addSql(
      `create index "match_game_player_game_id_index" on "match_game_player" ("game_id");`,
    );

    this.addSql(`drop table if exists "match_game_replay" cascade;`);
  }
}
