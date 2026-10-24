import { Migration } from "@mikro-orm/migrations";

export class Migration20261024120000_addRosterStatus extends Migration {
  override name = "Migration20261024120000_addRosterStatus";

  override up(): void | Promise<void> {
    this.addSql(
      `alter table "player" add "status" text check ("status" in ('active', 'free_agent', 'retired')) not null default 'active';`,
    );
    this.addSql(`alter table "team" add "active" boolean not null default true;`);
    this.addSql(
      `alter table "contract" add "join_source_url" text null, add "leave_source_url" text null;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table "contract" drop column "join_source_url", drop column "leave_source_url";`,
    );
    this.addSql(`alter table "team" drop column "active";`);
    this.addSql(`alter table "player" drop column "status";`);
  }
}
