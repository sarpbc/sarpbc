import { Migration } from "@mikro-orm/migrations";

export class Migration20261024150000_addRosterProposals extends Migration {
  override name = "Migration20261024150000_addRosterProposals";

  override up(): void | Promise<void> {
    this.addSql(
      `create table "roster_proposal" ("id" uuid not null default gen_random_uuid(), "kind" varchar(255) not null, "change" jsonb not null, "source_url" text not null, "status" varchar(255) not null default 'pending', "proposed_by_id" uuid not null, "reviewed_by_id" uuid null, "reviewed_at" timestamptz null, "entity_id" uuid null, "created_at" timestamptz not null default now(), primary key ("id"));`,
    );
    this.addSql(
      `create index "roster_proposal_status_created_at_index" on "roster_proposal" ("status", "created_at");`,
    );
    this.addSql(
      `alter table "roster_proposal" add constraint "roster_proposal_proposed_by_id_foreign" foreign key ("proposed_by_id") references "user" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "roster_proposal" add constraint "roster_proposal_reviewed_by_id_foreign" foreign key ("reviewed_by_id") references "user" ("id") on update cascade on delete set null;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "roster_proposal" cascade;`);
  }
}
