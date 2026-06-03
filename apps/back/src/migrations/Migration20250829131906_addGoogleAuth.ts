import { Migration } from "@mikro-orm/migrations";

export class Migration20250829131906_addGoogleAuth extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "user" drop column "first_name", drop column "last_name";`);

    this.addSql(
      `alter table "user" add column "user_name" varchar(255) not null, add column "google_id" varchar(255) null;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "user" drop column "google_id";`);

    this.addSql(`alter table "user" add column "last_name" varchar(255) not null;`);
    this.addSql(`alter table "user" rename column "user_name" to "first_name";`);
  }
}
