import { Migration } from "@mikro-orm/migrations";

export class Migration20260721073937_addReplyMatchTarget extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "reply" add column "match_id" varchar(255) null;`);
    this.addSql(`alter table "reply" add column "hidden_at" timestamptz null;`);

    this.addSql(
      `alter table "reply" add constraint "reply_match_id_foreign" foreign key ("match_id") references "match" ("id") on update cascade on delete set null;`,
    );

    this.addSql(`create index "reply_match_id_index" on "reply" ("match_id");`);
    this.addSql(`create index "reply_hidden_at_index" on "reply" ("hidden_at");`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "reply" drop constraint "reply_match_id_foreign";`);
    this.addSql(`drop index "reply_match_id_index";`);
    this.addSql(`drop index "reply_hidden_at_index";`);
    this.addSql(`alter table "reply" drop column "match_id";`);
    this.addSql(`alter table "reply" drop column "hidden_at";`);
  }
}
