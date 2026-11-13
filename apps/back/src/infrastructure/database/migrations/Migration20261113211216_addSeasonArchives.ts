import { Migration } from "@mikro-orm/migrations";

export class Migration20261113211216_addSeasonArchives extends Migration {
  override name = "Migration20261113211216_addSeasonArchives";

  override up(): void | Promise<void> {
    this.addSql(
      `create table "season_participant" ("id" uuid not null default gen_random_uuid(), "season_id" uuid not null, "team_id" uuid not null, "path_note" text null, "created_at" timestamptz not null default now(), primary key ("id"));`,
    );
    this.addSql(
      `create index "season_participant_team_id_index" on "season_participant" ("team_id");`,
    );
    this.addSql(
      `alter table "season_participant" add constraint "season_participant_season_id_team_id_unique" unique ("season_id", "team_id");`,
    );

    this.addSql(
      `create table "season_path_entry" ("id" uuid not null default gen_random_uuid(), "participant_id" uuid not null, "label" varchar(255) not null, "result" varchar(255) not null, "tournament_id" varchar(255) null, "created_at" timestamptz not null default now(), primary key ("id"));`,
    );
    this.addSql(
      `create index "season_path_entry_participant_id_index" on "season_path_entry" ("participant_id");`,
    );
    this.addSql(
      `create index "season_path_entry_tournament_id_index" on "season_path_entry" ("tournament_id");`,
    );

    this.addSql(
      `alter table "season" add "slug" varchar(255) null, add "format_summary" text null, add "format_phases" jsonb not null default '[]', add "winner_team_id" uuid null;`,
    );
    this.addSql(
      `alter table "season" add constraint "season_winner_team_id_foreign" foreign key ("winner_team_id") references "team" ("id") on update cascade on delete set null;`,
    );
    this.addSql(`alter table "season" add constraint "season_slug_unique" unique ("slug");`);

    this.addSql(
      `alter table "season_participant" add constraint "season_participant_season_id_foreign" foreign key ("season_id") references "season" ("id") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "season_participant" add constraint "season_participant_team_id_foreign" foreign key ("team_id") references "team" ("id") on update cascade on delete cascade;`,
    );

    this.addSql(
      `alter table "season_path_entry" add constraint "season_path_entry_participant_id_foreign" foreign key ("participant_id") references "season_participant" ("id") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "season_path_entry" add constraint "season_path_entry_tournament_id_foreign" foreign key ("tournament_id") references "tournament" ("id") on update cascade on delete set null;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table "season_path_entry" drop constraint "season_path_entry_participant_id_foreign";`,
    );

    this.addSql(`drop table if exists "season_participant" cascade;`);
    this.addSql(`drop table if exists "season_path_entry" cascade;`);

    this.addSql(`alter table "season" drop constraint "season_winner_team_id_foreign";`);

    this.addSql(`alter table "season" drop constraint "season_slug_unique";`);
    this.addSql(
      `alter table "season" drop column "slug", drop column "format_summary", drop column "format_phases", drop column "winner_team_id";`,
    );
  }
}
