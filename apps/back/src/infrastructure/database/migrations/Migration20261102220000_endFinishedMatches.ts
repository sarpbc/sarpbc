import { Migration } from "@mikro-orm/migrations";

export class Migration20261102220000_endFinishedMatches extends Migration {
  override name = "Migration20261102220000_endFinishedMatches";

  override up(): void | Promise<void> {
    this.addSql(
      `update "match" set "end_at" = "updated_at" where "status" = 'finished' and "end_at" is null;`,
    );
  }
}
