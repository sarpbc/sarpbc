import { Migration } from "@mikro-orm/migrations";

export class Migration20261031120000_alignCurrentTeamWithOpenContract extends Migration {
  override name = "Migration20261031120000_alignCurrentTeamWithOpenContract";

  override up(): void | Promise<void> {
    this.addSql(`
      do $$
      declare
        affected record;
      begin
        for affected in
          select p."slug", p."team_id"::text as current_team_id, open."team_id"::text as contract_team_id
          from "player" p
          join (
            select "player_id", min("team_id"::text)::uuid as "team_id"
            from "contract"
            where "end_date" is null
            group by "player_id"
            having count(*) = 1
          ) open on open."player_id" = p."id"
          where p."team_id" is distinct from open."team_id"
          order by p."slug"
        loop
          raise notice 'align current team: % % -> %',
            affected.slug, affected.current_team_id, affected.contract_team_id;
        end loop;
      end $$;
    `);
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
