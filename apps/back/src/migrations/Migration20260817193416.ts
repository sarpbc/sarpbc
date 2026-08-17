import { Migration } from "@mikro-orm/migrations";

export class Migration20260817193416 extends Migration {
  override name = "Migration20260817193416";

  override up(): void | Promise<void> {
    this.addSql(`alter table "reply_report" drop constraint "reply_report_reply_id_foreign";`);

    this.addSql(
      `alter table "reply_notification" drop constraint "reply_notification_reply_id_foreign";`,
    );

    this.addSql(
      `alter table "reply_report" add constraint "reply_report_reply_id_foreign" foreign key ("reply_id") references "reply" ("id") on update cascade on delete cascade;`,
    );

    this.addSql(
      `alter table "reply_notification" add constraint "reply_notification_reply_id_foreign" foreign key ("reply_id") references "reply" ("id") on update cascade on delete cascade;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table "reply_notification" drop constraint "reply_notification_reply_id_foreign";`,
    );

    this.addSql(`alter table "reply_report" drop constraint "reply_report_reply_id_foreign";`);

    this.addSql(
      `alter table "reply_notification" add constraint "reply_notification_reply_id_foreign" foreign key ("reply_id") references "reply" ("id") on update cascade;`,
    );

    this.addSql(
      `alter table "reply_report" add constraint "reply_report_reply_id_foreign" foreign key ("reply_id") references "reply" ("id") on update cascade;`,
    );
  }
}
