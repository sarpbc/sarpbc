import { Migration } from "@mikro-orm/migrations";

export class Migration20261126120000_deriveStageWinners extends Migration {
  override name = "Migration20261126120000_deriveStageWinners";

  override up() {
    this.addSql(
      `update "tournament" "t" set "winner_id" = "derived"."winner_id" from (select "s"."id", coalesce((select (array_agg("m"."winner_id"))[1] from "match" "m" where "m"."tournament_id" = "s"."id" and exists (select 1 from "bracket_link" "l" where "l"."match_id" = "m"."id") and not exists (select 1 from "bracket_link" "l" where "l"."previous_match_id" = "m"."id") having count(*) = 1), (select (array_agg("tp"."id"))[1] from "tournament_prize" "p" join "tournament_participant" "tp" on "tp"."tournament_id" = "p"."tournament_id" and "tp"."team_id" = "p"."team_id" where "p"."tournament_id" = "s"."id" and "p"."placement" = 1 having count(*) = 1)) as "winner_id" from "tournament" "s" where "s"."source" <> 'pandascore') "derived" where "t"."id" = "derived"."id" and "derived"."winner_id" is not null and "t"."winner_id" is distinct from "derived"."winner_id";`,
    );
  }
}
