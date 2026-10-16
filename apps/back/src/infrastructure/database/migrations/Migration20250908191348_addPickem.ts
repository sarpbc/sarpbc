import { Migration } from "@mikro-orm/migrations";

export class Migration20250908191348_addPickem extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "pickem_choice" ("id" varchar(255) not null, "user_id" uuid not null, "match_id" varchar(255) not null, "picked_participant_id" varchar(255) not null, "points" int null, "scored" boolean not null default 'false', "created_at" date not null, constraint "pickem_choice_pkey" primary key ("id"));`,
    );

    this.addSql(
      `alter table "pickem_choice" add constraint "pickem_choice_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "pickem_choice" add constraint "pickem_choice_match_id_foreign" foreign key ("match_id") references "match" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "pickem_choice" add constraint "pickem_choice_picked_participant_id_foreign" foreign key ("picked_participant_id") references "tournament_participant" ("id") on update cascade;`,
    );

    this.addSql(
      `alter table "match" alter column "begin_at" type timestamptz using ("begin_at"::timestamptz);`,
    );
    this.addSql(
      `alter table "match" alter column "end_at" type timestamptz using ("end_at"::timestamptz);`,
    );
    this.addSql(
      `alter table "match" alter column "created_at" type timestamptz using ("created_at"::timestamptz);`,
    );
    this.addSql(
      `alter table "match" alter column "updated_at" type timestamptz using ("updated_at"::timestamptz);`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "pickem_choice" cascade;`);

    this.addSql(`alter table "match" alter column "begin_at" type date using ("begin_at"::date);`);
    this.addSql(`alter table "match" alter column "end_at" type date using ("end_at"::date);`);
    this.addSql(
      `alter table "match" alter column "created_at" type date using ("created_at"::date);`,
    );
    this.addSql(
      `alter table "match" alter column "updated_at" type date using ("updated_at"::date);`,
    );
  }
}
