import { Migration } from "@mikro-orm/migrations";

export class Migration20260720182117 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(`alter table "player" add "role" varchar(255) null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "player" drop column "role";`);
  }
}
