import { Migration } from "@mikro-orm/migrations";

export class Migration20260809190816_addNotification extends Migration {
  override name = "Migration20260809190816_addNotification";

  override up(): void | Promise<void> {
    this.addSql(
      `create table "reply_report" ("id" uuid not null default gen_random_uuid(), "reply_id" uuid not null, "reporter_id" uuid not null, "reason" varchar(255) not null, "created_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(
      `create index "reply_report_reply_id_reporter_id_index" on "reply_report" ("reply_id", "reporter_id");`,
    );
    this.addSql(`create index "reply_report_reply_id_index" on "reply_report" ("reply_id");`);
    this.addSql(`create index "reply_report_created_at_index" on "reply_report" ("created_at");`);

    this.addSql(
      `create table "reply_notification" ("id" uuid not null default gen_random_uuid(), "recipient_id" uuid not null, "reply_id" uuid not null, "read_at" timestamptz null, "created_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(
      `create index "reply_notification_recipient_id_read_at_index" on "reply_notification" ("recipient_id", "read_at");`,
    );
    this.addSql(
      `create index "reply_notification_recipient_id_created_at_index" on "reply_notification" ("recipient_id", "created_at");`,
    );

    this.addSql(
      `alter table "reply_report" add constraint "reply_report_reply_id_foreign" foreign key ("reply_id") references "reply" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "reply_report" add constraint "reply_report_reporter_id_foreign" foreign key ("reporter_id") references "user" ("id") on update cascade;`,
    );

    this.addSql(
      `alter table "reply_notification" add constraint "reply_notification_recipient_id_foreign" foreign key ("recipient_id") references "user" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "reply_notification" add constraint "reply_notification_reply_id_foreign" foreign key ("reply_id") references "reply" ("id") on update cascade;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "reply_report" cascade;`);
    this.addSql(`drop table if exists "reply_notification" cascade;`);
  }
}
