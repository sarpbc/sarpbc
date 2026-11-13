import { Migration } from "@mikro-orm/migrations";

export class Migration20261112215726_addSeasonAwards extends Migration {
  override name = "Migration20261112215726_addSeasonAwards";

  override up(): void | Promise<void> {
    this.addSql(
      `create table "season" ("id" uuid not null, "name" varchar(255) not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), primary key ("id"));`,
    );
    this.addSql(`alter table "season" add constraint "season_name_unique" unique ("name");`);

    this.addSql(
      `create table "season_award" ("id" uuid not null default gen_random_uuid(), "season_id" uuid not null, "player_id" uuid not null, "award_type" text not null, "region" varchar(255) null, "presented_by" varchar(255) null, "source_url" text not null, "created_at" timestamptz not null default now(), primary key ("id"));`,
    );
    this.addSql(`create index "season_award_player_id_index" on "season_award" ("player_id");`);
    this.addSql(
      `alter table "season_award" add constraint "season_award_season_id_award_type_region_unique" unique ("season_id", "award_type", "region");`,
    );

    this.addSql(
      `alter table "season_award" add constraint "season_award_season_id_foreign" foreign key ("season_id") references "season" ("id") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "season_award" add constraint "season_award_player_id_foreign" foreign key ("player_id") references "player" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "season_award" add constraint "season_award_award_type_check" check ("award_type" in ('season_mvp', 'regular_season_mvp', 'regional_mvp'));`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "season_award" drop constraint "season_award_season_id_foreign";`);

    this.addSql(`drop table if exists "season" cascade;`);
    this.addSql(`drop table if exists "season_award" cascade;`);
  }
}
