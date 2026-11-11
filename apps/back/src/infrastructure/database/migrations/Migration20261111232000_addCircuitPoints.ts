import { Migration } from "@mikro-orm/migrations";

export class Migration20261111232000_addCircuitPoints extends Migration {
  override name = "Migration20261111232000_addCircuitPoints";

  override up(): void | Promise<void> {
    this.addSql(
      `create table "circuit" ("id" uuid not null, "slug" varchar(255) not null, "name" varchar(255) not null, "description" text null, "qualification_spots" int null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), primary key ("id"));`,
    );
    this.addSql(`alter table "circuit" add constraint "circuit_slug_unique" unique ("slug");`);

    this.addSql(
      `create table "circuit_stage" ("id" uuid not null default gen_random_uuid(), "circuit_id" uuid not null, "tournament_id" varchar(255) not null, "scale" jsonb not null default '[]', "source_url" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), primary key ("id"));`,
    );
    this.addSql(
      `create index "circuit_stage_tournament_id_index" on "circuit_stage" ("tournament_id");`,
    );
    this.addSql(
      `alter table "circuit_stage" add constraint "circuit_stage_circuit_id_tournament_id_unique" unique ("circuit_id", "tournament_id");`,
    );

    this.addSql(`alter table "tournament_participant" add "placement" int null;`);

    this.addSql(
      `alter table "circuit_stage" add constraint "circuit_stage_circuit_id_foreign" foreign key ("circuit_id") references "circuit" ("id") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "circuit_stage" add constraint "circuit_stage_tournament_id_foreign" foreign key ("tournament_id") references "tournament" ("id") on update cascade on delete cascade;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "circuit_stage" drop constraint "circuit_stage_circuit_id_foreign";`);

    this.addSql(`drop table if exists "circuit" cascade;`);
    this.addSql(`drop table if exists "circuit_stage" cascade;`);

    this.addSql(`alter table "tournament_participant" drop column "placement";`);
  }
}
