import { Migration } from "@mikro-orm/migrations";

export class Migration20250821141114_addForum extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "topic" ("id" uuid not null default gen_random_uuid(), "title" varchar(255) not null, "description" text null, "created_at" timestamptz not null, "updated_at" timestamptz null, constraint "topic_pkey" primary key ("id"));`,
    );

    this.addSql(
      `create table "post" ("id" uuid not null default gen_random_uuid(), "title" varchar(255) not null, "content" text not null, "topic_id" uuid not null, "author_id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz null, constraint "post_pkey" primary key ("id"));`,
    );

    this.addSql(
      `create table "reply" ("id" uuid not null default gen_random_uuid(), "content" text not null, "created_at" timestamptz not null, "author_id" uuid not null, "post_id" uuid not null, "reply_to_id" uuid null, constraint "reply_pkey" primary key ("id"));`,
    );

    this.addSql(
      `alter table "post" add constraint "post_topic_id_foreign" foreign key ("topic_id") references "topic" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "post" add constraint "post_author_id_foreign" foreign key ("author_id") references "user" ("id") on update cascade;`,
    );

    this.addSql(
      `alter table "reply" add constraint "reply_author_id_foreign" foreign key ("author_id") references "user" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "reply" add constraint "reply_post_id_foreign" foreign key ("post_id") references "post" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "reply" add constraint "reply_reply_to_id_foreign" foreign key ("reply_to_id") references "reply" ("id") on update cascade on delete set null;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "post" drop constraint "post_topic_id_foreign";`);

    this.addSql(`alter table "reply" drop constraint "reply_post_id_foreign";`);

    this.addSql(`alter table "reply" drop constraint "reply_reply_to_id_foreign";`);

    this.addSql(`drop table if exists "topic" cascade;`);

    this.addSql(`drop table if exists "post" cascade;`);

    this.addSql(`drop table if exists "reply" cascade;`);
  }
}
