import { Migration } from "@mikro-orm/migrations";

export class Migration20261113010000_seasonAwardNullRegionUnique extends Migration {
  override name = "Migration20261113010000_seasonAwardNullRegionUnique";

  override up(): void | Promise<void> {
    this.addSql(
      `alter table "season_award" drop constraint "season_award_season_id_award_type_region_unique";`,
    );
    this.addSql(
      `alter table "season_award" add constraint "season_award_season_id_award_type_region_unique" unique nulls not distinct ("season_id", "award_type", "region");`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table "season_award" drop constraint "season_award_season_id_award_type_region_unique";`,
    );
    this.addSql(
      `alter table "season_award" add constraint "season_award_season_id_award_type_region_unique" unique ("season_id", "award_type", "region");`,
    );
  }
}
