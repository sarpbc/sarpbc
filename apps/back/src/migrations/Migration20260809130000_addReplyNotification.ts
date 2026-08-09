import { Migration } from "@mikro-orm/migrations";

export class Migration20260809130000_addReplyNotification extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table "reply_notification" (
        "id" varchar(255) not null,
        "recipient_id" varchar(255) not null,
        "reply_id" varchar(255) not null,
        "read_at" timestamptz null,
        "created_at" timestamptz not null,
        constraint "reply_notification_pkey" primary key ("id")
      );
    `);

    this.addSql(`
      alter table "reply_notification"
      add constraint "reply_notification_recipient_id_foreign"
      foreign key ("recipient_id") references "user" ("id")
      on update cascade on delete cascade;
    `);

    this.addSql(`
      alter table "reply_notification"
      add constraint "reply_notification_reply_id_foreign"
      foreign key ("reply_id") references "reply" ("id")
      on update cascade on delete cascade;
    `);

    this.addSql(
      `create index "reply_notification_recipient_id_read_at_index" on "reply_notification" ("recipient_id", "read_at");`,
    );
    this.addSql(
      `create index "reply_notification_recipient_id_created_at_index" on "reply_notification" ("recipient_id", "created_at");`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "reply_notification" cascade;`);
  }
}
