import { Migration } from "@mikro-orm/migrations";

export class Migration20261113211000_circuitIdentityUnique extends Migration {
  override name = "Migration20261113211000_circuitIdentityUnique";

  override up(): void | Promise<void> {
    this.addSql(
      `create unique index "circuit_identity_unique" on "circuit" (lower("name"), "season", lower("region")) nulls not distinct;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`drop index "circuit_identity_unique";`);
  }
}
