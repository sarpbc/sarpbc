import { Migration } from "@mikro-orm/migrations";

export class Migration20250818171052_addAirRiddleEntity extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "air_riddle" ("id" uuid not null default gen_random_uuid(), "player_id" varchar(255) not null, "player_name" varchar(255) not null, "created_at" date not null default now(), constraint "air_riddle_pkey" primary key ("id"));`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "air_riddle" cascade;`);
  }
}
