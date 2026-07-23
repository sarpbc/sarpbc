import { Migration } from "@mikro-orm/migrations";

export class Migration20260723191839 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(`alter table "user" drop column "admin";`);
    this.addSql(`alter table "user" add "role" varchar(255) null;`);

    this.addSql(`drop index "reply_hidden_at_index";`);
    this.addSql(`drop index "reply_match_id_index";`);
  }

  override down(): void | Promise<void> {
    this.addSql(`create index "reply_hidden_at_index" on "reply" ("hidden_at");`);
    this.addSql(`create index "reply_match_id_index" on "reply" ("match_id");`);

    this.addSql(`alter table "user" drop column "role";`);
    this.addSql(`alter table "user" add "admin" boolean not null default false;`);
  }
}
