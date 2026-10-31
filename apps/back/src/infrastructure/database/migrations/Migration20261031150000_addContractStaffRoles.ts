import { Migration } from "@mikro-orm/migrations";

export class Migration20261031150000_addContractStaffRoles extends Migration {
  override name = "Migration20261031150000_addContractStaffRoles";

  override up(): void | Promise<void> {
    this.addSql(`alter table "contract" drop constraint if exists "contract_role_check";`);
    this.addSql(
      `alter table "contract" add constraint "contract_role_check" check ("role" in ('active', 'benched', 'loaned', 'coach', 'assistant_coach', 'analyst', 'manager'));`,
    );
    this.addSql(
      `create index "contract_open_player_team_idx" on "contract" ("player_id", "team_id") where "end_date" is null;`,
    );
    this.addSql(`
      update "contract" c
      set "role" = staff."role"
      from (
        select p."id", p."team_id",
          case regexp_replace(lower(trim(p."role")), '[[:space:]-]+', '_', 'g')
            when 'coach' then 'coach'
            when 'head_coach' then 'coach'
            when 'assistant_coach' then 'assistant_coach'
            when 'co_coach' then 'assistant_coach'
            when 'analyst' then 'analyst'
            when 'manager' then 'manager'
            when 'staff' then 'manager'
          end as "role"
        from "player" p
        where p."role" is not null
      ) staff
      where c."player_id" = staff."id"
        and c."team_id" = staff."team_id"
        and c."end_date" is null
        and staff."role" is not null;
    `);
    this.addSql(`
      update "roster_proposal"
      set "status" = 'rejected', "reviewed_at" = now()
      where "status" = 'pending'
        and "kind" in ('create_player', 'update_player')
        and "change" -> 'role' is not null;
    `);
    this.addSql(`
      update "roster_proposal"
      set "change" = "change" - 'role'
      where "kind" in ('create_player', 'update_player')
        and "change" -> 'role' is not null;
    `);
  }

  override down(): void | Promise<void> {
    this.addSql(
      `update "contract" set "role" = 'active' where "role" in ('coach', 'assistant_coach', 'analyst', 'manager');`,
    );
    this.addSql(`drop index if exists "contract_open_player_team_idx";`);
    this.addSql(`alter table "contract" drop constraint if exists "contract_role_check";`);
    this.addSql(
      `alter table "contract" add constraint "contract_role_check" check ("role" in ('active', 'benched', 'loaned'));`,
    );
  }
}
