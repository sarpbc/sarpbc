import { Migration } from "@mikro-orm/migrations";

export class Migration20260829092109_addTeamDarkModeImageUrl extends Migration {
  override name = "Migration20260829092109_addTeamDarkModeImageUrl";

  override up(): void | Promise<void> {
    this.addSql(`alter table "team" add "dark_mode_image_url" varchar(255) null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "team" drop column "dark_mode_image_url";`);
  }
}
