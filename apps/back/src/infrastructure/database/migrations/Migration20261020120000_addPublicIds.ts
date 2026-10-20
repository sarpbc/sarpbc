import { Migration } from "@mikro-orm/migrations";

const PUBLIC_ID_TABLES = [
  { table: "match", chronology: `"begin_at", "id"` },
  { table: "post", chronology: `"created_at", "id"` },
] as const;

export class Migration20261020120000_addPublicIds extends Migration {
  override name = "Migration20261020120000_addPublicIds";

  override up(): void | Promise<void> {
    for (const { table, chronology } of PUBLIC_ID_TABLES) {
      this.addSql(`alter table "${table}" add "public_id" int null;`);
      this.addSql(
        `update "${table}" set "public_id" = ranked."public_id" from (select "id", row_number() over (order by ${chronology}) as "public_id" from "${table}") as ranked where ranked."id" = "${table}"."id";`,
      );
      this.addSql(`alter table "${table}" alter column "public_id" set not null;`);
      this.addSql(
        `alter table "${table}" alter column "public_id" add generated always as identity;`,
      );
      this.addSql(
        `select setval(pg_get_serial_sequence('"${table}"', 'public_id'), coalesce(max("public_id"), 1), count(*) > 0) from "${table}";`,
      );
      this.addSql(
        `alter table "${table}" add constraint "${table}_public_id_unique" unique ("public_id");`,
      );
    }
  }

  override down(): void | Promise<void> {
    for (const { table } of PUBLIC_ID_TABLES) {
      this.addSql(`alter table "${table}" drop constraint "${table}_public_id_unique";`);
      this.addSql(`alter table "${table}" drop column "public_id";`);
    }
  }
}
