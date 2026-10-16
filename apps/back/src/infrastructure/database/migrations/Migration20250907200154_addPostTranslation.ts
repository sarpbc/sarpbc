import { Migration } from "@mikro-orm/migrations";

export class Migration20250907200154_addPostTranslation extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "post_translation" ("id" uuid not null default gen_random_uuid(), "post_id" uuid not null, "locale" varchar(255) not null, "title" varchar(255) not null, "content" text not null, "created_at" timestamptz not null, "updated_at" timestamptz null, constraint "post_translation_pkey" primary key ("id"));`,
    );

    this.addSql(
      `alter table "post_translation" add constraint "post_translation_post_id_foreign" foreign key ("post_id") references "post" ("id") on update cascade;`,
    );

    this.addSql(
      `alter table "post" add column "post_type" text check ("post_type" in ('ARTICLE', 'DISCUSSION')) not null default 'DISCUSSION';`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "post_translation" cascade;`);

    this.addSql(`alter table "post" drop column "post_type";`);
  }
}
