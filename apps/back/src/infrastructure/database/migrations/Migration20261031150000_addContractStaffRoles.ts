import { Migration } from "@mikro-orm/migrations";

export class Migration20261031150000_addContractStaffRoles extends Migration {
  override name = "Migration20261031150000_addContractStaffRoles";

  override up(): void | Promise<void> {
    this.addSql(`alter table "contract" drop constraint if exists "contract_role_check";`);
    this.addSql(
      `alter table "contract" add constraint "contract_role_check" check ("role" in ('active', 'benched', 'loaned', 'coach', 'assistant_coach', 'analyst', 'manager'));`,
    );
    this.addSql(`
      update "contract" c
      set "role" = 'coach'
      from "player" p
      where c."player_id" = p."id"
        and c."team_id" = p."team_id"
        and c."end_date" is null
        and lower(trim(p."role")) = 'coach';
    `);
  }

  override down(): void | Promise<void> {
    this.addSql(
      `update "contract" set "role" = 'active' where "role" in ('coach', 'assistant_coach', 'analyst', 'manager');`,
    );
    this.addSql(`alter table "contract" drop constraint if exists "contract_role_check";`);
    this.addSql(
      `alter table "contract" add constraint "contract_role_check" check ("role" in ('active', 'benched', 'loaned'));`,
    );
  }
}
