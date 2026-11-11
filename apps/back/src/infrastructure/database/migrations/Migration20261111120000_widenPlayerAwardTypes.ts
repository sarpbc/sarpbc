import { Migration } from "@mikro-orm/migrations";

export class Migration20261111120000_widenPlayerAwardTypes extends Migration {
  override name = "Migration20261111120000_widenPlayerAwardTypes";

  override up(): void | Promise<void> {
    this.addSql(`alter table "player_award" drop constraint "player_award_award_type_check";`);
    this.addSql(
      `alter table "player_award" add constraint "player_award_award_type_check" check ("award_type" in ('mvp', 'grand_finals_mvp', 'offensive_mvp', 'defensive_mvp', 'breakthrough_player'));`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "player_award" drop constraint "player_award_award_type_check";`);
    this.addSql(
      `alter table "player_award" add constraint "player_award_award_type_check" check ("award_type" in ('mvp', 'defensive_mvp'));`,
    );
  }
}
