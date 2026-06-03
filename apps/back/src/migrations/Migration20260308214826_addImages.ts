import { Migration } from "@mikro-orm/migrations";

export class Migration20260308214826_addImages extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "image" ("id" uuid not null default gen_random_uuid(), "image_id" varchar(255) not null, "url" varchar(500) not null, "created_at" timestamptz not null, constraint "image_pkey" primary key ("id"));`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "image" cascade;`);
  }
}
