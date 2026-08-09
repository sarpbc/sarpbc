import { Migration } from "@mikro-orm/migrations";

export class Migration20260809120000_addReplyReport extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table "reply_report" (
        "id" varchar(255) not null,
        "reply_id" varchar(255) not null,
        "reporter_id" varchar(255) not null,
        "reason" text not null,
        "created_at" timestamptz not null,
        constraint "reply_report_pkey" primary key ("id")
      );
    `);

    this.addSql(`
      alter table "reply_report"
      add constraint "reply_report_reply_id_foreign"
      foreign key ("reply_id") references "reply" ("id")
      on update cascade on delete cascade;
    `);

    this.addSql(`
      alter table "reply_report"
      add constraint "reply_report_reporter_id_foreign"
      foreign key ("reporter_id") references "user" ("id")
      on update cascade on delete cascade;
    `);

    this.addSql(
      `create unique index "reply_report_reply_id_reporter_id_unique" on "reply_report" ("reply_id", "reporter_id");`,
    );
    this.addSql(`create index "reply_report_reply_id_index" on "reply_report" ("reply_id");`);
    this.addSql(`create index "reply_report_created_at_index" on "reply_report" ("created_at");`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "reply_report" cascade;`);
  }
}
