import { Migration } from "@mikro-orm/migrations";

export class Migration20261024160000_restrictMergedIntoDelete extends Migration {
  override name = "Migration20261024160000_restrictMergedIntoDelete";

  override up(): void | Promise<void> {
    for (const table of ["player", "team"]) {
      this.addSql(`alter table "${table}" drop constraint "${table}_merged_into_id_foreign";`);
      this.addSql(
        `alter table "${table}" add constraint "${table}_merged_into_id_foreign" foreign key ("merged_into_id") references "${table}" ("id") on update cascade on delete restrict;`,
      );
    }
  }

  override down(): void | Promise<void> {
    for (const table of ["player", "team"]) {
      this.addSql(`alter table "${table}" drop constraint "${table}_merged_into_id_foreign";`);
      this.addSql(
        `alter table "${table}" add constraint "${table}_merged_into_id_foreign" foreign key ("merged_into_id") references "${table}" ("id") on update cascade on delete set null;`,
      );
    }
  }
}
