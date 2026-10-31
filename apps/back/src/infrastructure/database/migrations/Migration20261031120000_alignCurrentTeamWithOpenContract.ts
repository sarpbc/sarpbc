import { Migration } from "@mikro-orm/migrations";

export class Migration20261031120000_alignCurrentTeamWithOpenContract extends Migration {
  override name = "Migration20261031120000_alignCurrentTeamWithOpenContract";

  override up(): void | Promise<void> {
    this.addSql(`
      update "player" p
      set "team_id" = open."team_id"
      from (
        select "player_id", min("team_id"::text)::uuid as "team_id"
        from "contract"
        where "end_date" is null
        group by "player_id"
        having count(*) = 1
      ) open
      where p."id" = open."player_id"
        and p."team_id" is distinct from open."team_id";
    `);
  }

  override down(): void | Promise<void> {}
}
