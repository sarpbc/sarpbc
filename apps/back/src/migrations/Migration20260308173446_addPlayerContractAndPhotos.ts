import { Migration } from "@mikro-orm/migrations";

export class Migration20260308173446_addPlayerContractAndPhotos extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "player_photo" ("id" uuid not null default gen_random_uuid(), "player_id" uuid not null, "url" varchar(255) not null, "created_at" timestamptz not null default now(), constraint "player_photo_pkey" primary key ("id"));`,
    );

    this.addSql(
      `create table "contract" ("id" uuid not null default gen_random_uuid(), "player_id" uuid not null, "team_id" uuid not null, "start_date" date not null, "end_date" date null, "role" text check ("role" in ('active', 'benched', 'loaned')) not null default 'active', "created_at" timestamptz not null default now(), constraint "contract_pkey" primary key ("id"));`,
    );

    this.addSql(
      `alter table "player_photo" add constraint "player_photo_player_id_foreign" foreign key ("player_id") references "player" ("id") on update cascade;`,
    );

    this.addSql(
      `alter table "contract" add constraint "contract_player_id_foreign" foreign key ("player_id") references "player" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "contract" add constraint "contract_team_id_foreign" foreign key ("team_id") references "team" ("id") on update cascade;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "player_photo" cascade;`);

    this.addSql(`drop table if exists "contract" cascade;`);
  }
}
