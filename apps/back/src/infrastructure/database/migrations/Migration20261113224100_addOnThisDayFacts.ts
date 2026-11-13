import { Migration } from "@mikro-orm/migrations";

export class Migration20261113224100_addOnThisDayFacts extends Migration {
  override name = "Migration20261113224100_addOnThisDayFacts";

  override up(): void | Promise<void> {
    this.addSql(
      `create table "on_this_day_fact" ("id" uuid not null default gen_random_uuid(), "month" smallint not null, "day" smallint not null, "year" smallint null, "text_en" text not null, "text_fr" text not null, "player_id" uuid null, "team_id" uuid null, "tournament_id" varchar(255) null, "match_id" varchar(255) null, "source_url" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), primary key ("id"));`,
    );
    this.addSql(
      `create index "on_this_day_fact_month_day_index" on "on_this_day_fact" ("month", "day");`,
    );
    this.addSql(
      `create index "on_this_day_fact_player_id_index" on "on_this_day_fact" ("player_id");`,
    );
    this.addSql(`create index "on_this_day_fact_team_id_index" on "on_this_day_fact" ("team_id");`);
    this.addSql(
      `create index "on_this_day_fact_tournament_id_index" on "on_this_day_fact" ("tournament_id");`,
    );
    this.addSql(
      `create index "on_this_day_fact_match_id_index" on "on_this_day_fact" ("match_id");`,
    );

    this.addSql(
      `alter table "on_this_day_fact" add constraint "on_this_day_fact_player_id_foreign" foreign key ("player_id") references "player" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "on_this_day_fact" add constraint "on_this_day_fact_team_id_foreign" foreign key ("team_id") references "team" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "on_this_day_fact" add constraint "on_this_day_fact_tournament_id_foreign" foreign key ("tournament_id") references "tournament" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "on_this_day_fact" add constraint "on_this_day_fact_match_id_foreign" foreign key ("match_id") references "match" ("id") on update cascade on delete set null;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "on_this_day_fact" cascade;`);
  }
}
