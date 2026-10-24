import { Migration } from "@mikro-orm/migrations";

export class Migration20261024140000_addSourcesAndMerges extends Migration {
  override name = "Migration20261024140000_addSourcesAndMerges";

  override up(): void | Promise<void> {
    for (const table of ["player", "team", "match"]) {
      this.addSql(`alter table "${table}" add "source" varchar(255) not null default 'manual';`);
      this.addSql(
        `update "${table}" set "source" = 'pandascore' where "pandascore_id" is not null;`,
      );
    }
    for (const table of ["player", "team"]) {
      this.addSql(`alter table "${table}" add "merged_into_id" uuid null;`);
      this.addSql(
        `alter table "${table}" add constraint "${table}_merged_into_id_foreign" foreign key ("merged_into_id") references "${table}" ("id") on update cascade on delete set null;`,
      );
    }
  }

  override down(): void | Promise<void> {
    for (const table of ["player", "team"]) {
      this.addSql(`alter table "${table}" drop constraint "${table}_merged_into_id_foreign";`);
      this.addSql(`alter table "${table}" drop column "merged_into_id";`);
    }
    for (const table of ["player", "team", "match"]) {
      this.addSql(`alter table "${table}" drop column "source";`);
    }
  }
}
