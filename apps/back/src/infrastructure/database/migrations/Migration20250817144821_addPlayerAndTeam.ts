import { Migration } from "@mikro-orm/migrations";

export class Migration20250817144821_addPlayerAndTeam extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "team" ("id" uuid not null default gen_random_uuid(), "name" varchar(255) not null, "location" varchar(255) null, "slug" varchar(255) not null, constraint "team_pkey" primary key ("id"));`,
    );
    this.addSql(`create index "team_slug_index" on "team" ("slug");`);
    this.addSql(`create index "team_name_index" on "team" ("name");`);

    this.addSql(
      `create table "player" ("id" uuid not null default gen_random_uuid(), "name" varchar(255) not null, "team_id" uuid null, "birthday" date null, "nationality" varchar(255) null, "first_name" varchar(255) null, "last_name" varchar(255) null, "slug" varchar(255) not null, constraint "player_pkey" primary key ("id"));`,
    );
    this.addSql(`create index "player_slug_index" on "player" ("slug");`);
    this.addSql(`create index "player_name_index" on "player" ("name");`);

    this.addSql(
      `alter table "player" add constraint "player_team_id_foreign" foreign key ("team_id") references "team" ("id") on update cascade on delete set null;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "player" drop constraint "player_team_id_foreign";`);

    this.addSql(`drop table if exists "team" cascade;`);

    this.addSql(`drop table if exists "player" cascade;`);
  }
}
