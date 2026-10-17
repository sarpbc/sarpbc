import { Migration } from "@mikro-orm/migrations";

export class Migration20260301222612_addNewsEntity extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "news_article" ("id" uuid not null default gen_random_uuid(), "title" varchar(255) not null, "content" text not null, "author_id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz null, constraint "news_article_pkey" primary key ("id"));`,
    );

    this.addSql(
      `alter table "news_article" add constraint "news_article_author_id_foreign" foreign key ("author_id") references "user" ("id") on update cascade;`,
    );

    this.addSql(`alter table "reply" drop constraint "reply_post_id_foreign";`);

    this.addSql(`alter table "reply" add column "news_article_id" uuid null;`);
    this.addSql(`alter table "reply" alter column "post_id" drop default;`);
    this.addSql(
      `alter table "reply" alter column "post_id" type uuid using ("post_id"::text::uuid);`,
    );
    this.addSql(`alter table "reply" alter column "post_id" drop not null;`);
    this.addSql(
      `alter table "reply" add constraint "reply_news_article_id_foreign" foreign key ("news_article_id") references "news_article" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "reply" add constraint "reply_post_id_foreign" foreign key ("post_id") references "post" ("id") on update cascade on delete set null;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "reply" drop constraint "reply_news_article_id_foreign";`);

    this.addSql(`drop table if exists "news_article" cascade;`);

    this.addSql(`alter table "reply" drop constraint "reply_post_id_foreign";`);

    this.addSql(`alter table "reply" drop column "news_article_id";`);

    this.addSql(`alter table "reply" alter column "post_id" drop default;`);
    this.addSql(
      `alter table "reply" alter column "post_id" type uuid using ("post_id"::text::uuid);`,
    );
    this.addSql(`alter table "reply" alter column "post_id" set not null;`);
    this.addSql(
      `alter table "reply" add constraint "reply_post_id_foreign" foreign key ("post_id") references "post" ("id") on update cascade;`,
    );
  }
}
