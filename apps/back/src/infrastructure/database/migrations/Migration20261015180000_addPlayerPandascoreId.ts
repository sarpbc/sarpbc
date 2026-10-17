import { Migration } from "@mikro-orm/migrations";

export class Migration20261015180000_addPlayerPandascoreId extends Migration {
  override name = "Migration20261015180000_addPlayerPandascoreId";

  override up(): void | Promise<void> {
    this.addSql(`alter table "player" add "pandascore_id" int null;`);
    this.addSql(
      `alter table "player" add constraint "player_pandascore_id_unique" unique ("pandascore_id");`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "player" drop constraint "player_pandascore_id_unique";`);
    this.addSql(`alter table "player" drop column "pandascore_id";`);
  }
}
