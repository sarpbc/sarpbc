import { Migration } from "@mikro-orm/migrations";

export class Migration20261113223712_circuitRegionalStages extends Migration {
  override name = "Migration20261113223712_circuitRegionalStages";

  override up(): void | Promise<void> {
    this.addSql(
      `create table "circuit_stage_team" ("id" uuid not null default gen_random_uuid(), "stage_id" uuid not null, "team_id" uuid not null, "placement" int null, "region_member" boolean not null default false, primary key ("id"));`,
    );
    this.addSql(
      `create index "circuit_stage_team_team_id_index" on "circuit_stage_team" ("team_id");`,
    );
    this.addSql(
      `alter table "circuit_stage_team" add constraint "circuit_stage_team_stage_id_team_id_unique" unique ("stage_id", "team_id");`,
    );

    this.addSql(`alter table "circuit_stage" add "worldwide" boolean not null default false;`);

    this.addSql(
      `alter table "circuit_stage_team" add constraint "circuit_stage_team_stage_id_foreign" foreign key ("stage_id") references "circuit_stage" ("id") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "circuit_stage_team" add constraint "circuit_stage_team_team_id_foreign" foreign key ("team_id") references "team" ("id") on update cascade on delete cascade;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "circuit_stage_team" cascade;`);

    this.addSql(`alter table "circuit_stage" drop column "worldwide";`);
  }
}
