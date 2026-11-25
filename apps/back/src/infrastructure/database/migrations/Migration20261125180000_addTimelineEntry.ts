import { Migration } from "@mikro-orm/migrations";

export class Migration20261125180000_addTimelineEntry extends Migration {
  override name = "Migration20261125180000_addTimelineEntry";

  override up() {
    this.addSql(
      `create table "timeline_entry" ("id" uuid not null default gen_random_uuid(), "date" date not null, "kind" text check ("kind" in ('patch', 'format')) not null,"name_en" text not null, "name_fr" text not null, "note_en" text not null, "note_fr" text not null, "source_url" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), primary key ("id"));`,
    );
    this.addSql(`create index "timeline_entry_date_index" on "timeline_entry" ("date");`);
  }

  override down() {
    this.addSql(`drop table if exists "timeline_entry" cascade;`);
  }
}
