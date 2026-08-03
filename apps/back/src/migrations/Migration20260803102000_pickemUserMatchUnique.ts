import { Migration } from "@mikro-orm/migrations";

export class Migration20260803102000_pickemUserMatchUnique extends Migration {
  override async up(): Promise<void> {
    // Keep the newest pick per (user, match) before enforcing uniqueness.
    this.addSql(`
      delete from "pickem_choice" a
      using "pickem_choice" b
      where a.user_id = b.user_id
        and a.match_id = b.match_id
        and (
          a.created_at < b.created_at
          or (a.created_at = b.created_at and a.id < b.id)
        );
    `);

    this.addSql(`
      alter table "pickem_choice"
      add constraint "pickem_choice_user_match_unique" unique ("user_id", "match_id");
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      alter table "pickem_choice" drop constraint if exists "pickem_choice_user_match_unique";
    `);
  }
}
