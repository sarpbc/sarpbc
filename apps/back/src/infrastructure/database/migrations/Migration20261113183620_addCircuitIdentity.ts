import { Migration } from "@mikro-orm/migrations";

export class Migration20261113183620_addCircuitIdentity extends Migration {
  override name = "Migration20261113183620_addCircuitIdentity";

  override up(): void | Promise<void> {
    this.addSql(
      `alter table "circuit" add "season" int null, add "region" varchar(255) null, add "source_url" text null;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table "circuit" drop column "season", drop column "region", drop column "source_url";`,
    );
  }
}
