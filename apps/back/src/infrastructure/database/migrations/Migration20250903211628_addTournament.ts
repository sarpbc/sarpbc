import { Migration } from "@mikro-orm/migrations";

export class Migration20250903211628_addTournament extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "league" ("id" varchar(255) not null, "pandascore_id" int not null, "name" varchar(255) not null, "slug" varchar(255) null, "url" varchar(255) null, "image_url" varchar(255) null, "modified_at" date null, "created_at" date not null, "updated_at" date not null, constraint "league_pkey" primary key ("id"));`,
    );
    this.addSql(
      `alter table "league" add constraint "league_pandascore_id_unique" unique ("pandascore_id");`,
    );

    this.addSql(
      `create table "tournament" ("id" varchar(255) not null, "pandascore_id" int null, "name" varchar(255) not null, "description" varchar(255) null, "slug" varchar(255) null, "serie" varchar(255) null, "tier" varchar(255) null, "begin_at" date null, "end_at" date null, "winner_id" varchar(255) null, "winner_type" varchar(255) null, "type" varchar(255) null, "prizepool" varchar(255) null, "image_url" varchar(255) null, "league_id" varchar(255) null, "created_at" date not null, "updated_at" date not null, constraint "tournament_pkey" primary key ("id"));`,
    );
    this.addSql(
      `alter table "tournament" add constraint "tournament_pandascore_id_unique" unique ("pandascore_id");`,
    );

    this.addSql(
      `create table "tournament_participant" ("id" varchar(255) not null, "tournament_id" varchar(255) not null, "team_id" uuid not null, "created_at" date not null, "updated_at" date not null, constraint "tournament_participant_pkey" primary key ("id"));`,
    );

    this.addSql(
      `create table "tournament_participant_players" ("tournament_participant_id" varchar(255) not null, "player_id" uuid not null, constraint "tournament_participant_players_pkey" primary key ("tournament_participant_id", "player_id"));`,
    );

    this.addSql(
      `create table "match" ("id" varchar(255) not null, "pandascore_id" int null, "name" varchar(255) not null, "slug" varchar(255) null, "begin_at" date null, "end_at" date null, "status" varchar(255) null, "winner_id" varchar(255) null, "number_of_games" int null, "results" jsonb null, "created_at" date not null, "updated_at" date not null, "tournament_id" varchar(255) not null, constraint "match_pkey" primary key ("id"));`,
    );
    this.addSql(
      `alter table "match" add constraint "match_pandascore_id_unique" unique ("pandascore_id");`,
    );

    this.addSql(
      `create table "match_participants" ("match_id" varchar(255) not null, "tournament_participant_id" varchar(255) not null, constraint "match_participants_pkey" primary key ("match_id", "tournament_participant_id"));`,
    );

    this.addSql(
      `alter table "tournament" add constraint "tournament_winner_id_foreign" foreign key ("winner_id") references "tournament_participant" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "tournament" add constraint "tournament_league_id_foreign" foreign key ("league_id") references "league" ("id") on update cascade on delete set null;`,
    );

    this.addSql(
      `alter table "tournament_participant" add constraint "tournament_participant_tournament_id_foreign" foreign key ("tournament_id") references "tournament" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "tournament_participant" add constraint "tournament_participant_team_id_foreign" foreign key ("team_id") references "team" ("id") on update cascade;`,
    );

    this.addSql(
      `alter table "tournament_participant_players" add constraint "tournament_participant_players_tournament_partic_7dcf5_foreign" foreign key ("tournament_participant_id") references "tournament_participant" ("id") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "tournament_participant_players" add constraint "tournament_participant_players_player_id_foreign" foreign key ("player_id") references "player" ("id") on update cascade on delete cascade;`,
    );

    this.addSql(
      `alter table "match" add constraint "match_winner_id_foreign" foreign key ("winner_id") references "tournament_participant" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "match" add constraint "match_tournament_id_foreign" foreign key ("tournament_id") references "tournament" ("id") on update cascade;`,
    );

    this.addSql(
      `alter table "match_participants" add constraint "match_participants_match_id_foreign" foreign key ("match_id") references "match" ("id") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "match_participants" add constraint "match_participants_tournament_participant_id_foreign" foreign key ("tournament_participant_id") references "tournament_participant" ("id") on update cascade on delete cascade;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "tournament" drop constraint "tournament_league_id_foreign";`);

    this.addSql(
      `alter table "tournament_participant" drop constraint "tournament_participant_tournament_id_foreign";`,
    );

    this.addSql(`alter table "match" drop constraint "match_tournament_id_foreign";`);

    this.addSql(`alter table "tournament" drop constraint "tournament_winner_id_foreign";`);

    this.addSql(
      `alter table "tournament_participant_players" drop constraint "tournament_participant_players_tournament_partic_7dcf5_foreign";`,
    );

    this.addSql(`alter table "match" drop constraint "match_winner_id_foreign";`);

    this.addSql(
      `alter table "match_participants" drop constraint "match_participants_tournament_participant_id_foreign";`,
    );

    this.addSql(
      `alter table "match_participants" drop constraint "match_participants_match_id_foreign";`,
    );

    this.addSql(`drop table if exists "league" cascade;`);

    this.addSql(`drop table if exists "tournament" cascade;`);

    this.addSql(`drop table if exists "tournament_participant" cascade;`);

    this.addSql(`drop table if exists "tournament_participant_players" cascade;`);

    this.addSql(`drop table if exists "match" cascade;`);

    this.addSql(`drop table if exists "match_participants" cascade;`);
  }
}
