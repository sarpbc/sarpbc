import { Migration } from "@mikro-orm/migrations";

export class Migration20261106100000_dropRosterProposalKind extends Migration {
  override name = "Migration20261106100000_dropRosterProposalKind";

  override up(): void | Promise<void> {
    this.addSql(`alter table "roster_proposal" drop column "kind";`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "roster_proposal" add column "kind" varchar(255) null;`);
    this.addSql(`update "roster_proposal" set "kind" = "change"->>'kind';`);
    this.addSql(`alter table "roster_proposal" alter column "kind" set not null;`);
  }
}
