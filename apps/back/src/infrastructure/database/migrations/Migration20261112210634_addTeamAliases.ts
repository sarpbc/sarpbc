import { Migration } from "@mikro-orm/migrations";

export class Migration20261112210634_addTeamAliases extends Migration {
  override name = "Migration20261112210634_addTeamAliases";

  override up(): void | Promise<void> {
    this.addSql(
      `create table "team_alias" ("id" uuid not null default gen_random_uuid(), "team_id" uuid not null, "name" varchar(255) not null, "valid_from" date not null, "valid_to" date null, "source_url" text not null, "logo_url" text null, "pandascore_id" int null, "created_at" timestamptz not null default now(), primary key ("id"));`,
    );
    this.addSql(
      `alter table "team_alias" add constraint "team_alias_pandascore_id_unique" unique ("pandascore_id");`,
    );
    this.addSql(`create index "team_alias_team_id_index" on "team_alias" ("team_id");`);
    this.addSql(`create index "team_alias_name_index" on "team_alias" ("name");`);

    this.addSql(
      `alter table "team_alias" add constraint "team_alias_team_id_foreign" foreign key ("team_id") references "team" ("id") on update cascade on delete cascade;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "team_alias" cascade;`);
  }
}
