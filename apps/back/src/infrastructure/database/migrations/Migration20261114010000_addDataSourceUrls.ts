import { Migration } from "@mikro-orm/migrations";

export class Migration20261114010000_addDataSourceUrls extends Migration {
  override name = "Migration20261114010000_addDataSourceUrls";

  override up(): void | Promise<void> {
    this.addSql(`alter table "tournament_prize" add column "source_url" text null;`);
    this.addSql(`alter table "match" add column "source_url" text null;`);
    this.addSql(`alter table "tournament_participant" add column "roster_source_url" text null;`);
    // Approving a distribution recreates every row, so a row created within a minute of an approval came from it; later staff edits stay unsourced.
    this.addSql(`
      update "tournament_prize" as prize
      set "source_url" = (
        select p."source_url"
        from "roster_proposal" as p
        where p."status" = 'applied'
          and p."change"->>'kind' = 'set_tournament_prizes'
          and p."change"->>'tournamentId' = prize."tournament_id"
          and p."reviewed_at" between prize."created_at" - interval '1 minute'
            and prize."created_at" + interval '1 minute'
        order by p."reviewed_at" desc
        limit 1
      );
    `);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "tournament_prize" drop column "source_url";`);
    this.addSql(`alter table "match" drop column "source_url";`);
    this.addSql(`alter table "tournament_participant" drop column "roster_source_url";`);
  }
}
