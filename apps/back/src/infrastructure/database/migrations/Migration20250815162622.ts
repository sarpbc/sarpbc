import { Migration } from "@mikro-orm/migrations";

export class Migration20250815162622 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "user" ("id" uuid not null default gen_random_uuid(), "admin" boolean not null default 'false', "email" varchar(255) not null, "first_name" varchar(255) not null, "last_name" varchar(255) not null, "password" varchar(255) null, "avatar_url" varchar(255) null, "created_at" timestamptz not null default now(), constraint "user_pkey" primary key ("id"));`,
    );
    this.addSql(`create index "user_email_index" on "user" ("email");`);
  }
}
