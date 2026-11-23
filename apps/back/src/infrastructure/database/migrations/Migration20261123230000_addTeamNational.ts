import { Migration } from "@mikro-orm/migrations";

export class Migration20261123230000_addTeamNational extends Migration {
  override name = "Migration20261123230000_addTeamNational";

  override up() {
    this.addSql(`alter table "team" add column "national" boolean not null default false;`);
    this.addSql(
      `update "team" set "national" = true where "id" in (select "tp"."team_id" from "tournament_participant" "tp" join "tournament" "t" on "t"."id" = "tp"."tournament_id" join "league" "l" on "l"."id" = "t"."league_id" where "l"."name" = 'FIFAe World Cup');`,
    );
  }

  override down() {
    this.addSql(`alter table "team" drop column "national";`);
  }
}
