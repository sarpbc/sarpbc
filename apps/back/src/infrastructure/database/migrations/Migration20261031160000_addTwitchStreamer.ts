import { Migration } from "@mikro-orm/migrations";

export class Migration20261031160000_addTwitchStreamer extends Migration {
  override name = "Migration20261031160000_addTwitchStreamer";

  override up(): void | Promise<void> {
    this.addSql(
      `create table "twitch_streamer" ("id" uuid not null default gen_random_uuid(), "login" varchar(255) not null, "display_name" varchar(255) null, "created_at" timestamptz not null default now(), primary key ("id"));`,
    );
    this.addSql(
      `alter table "twitch_streamer" add constraint "twitch_streamer_login_unique" unique ("login");`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "twitch_streamer" cascade;`);
  }
}
