import { Migration } from "@mikro-orm/migrations";

export class Migration20261031180000_addTeamLogoVariants extends Migration {
  override name = "Migration20261031180000_addTeamLogoVariants";

  override up(): void | Promise<void> {
    this.addSql(
      `alter table "team" add "logo_light_url" text null, add "logo_dark_url" text null;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "team" drop column "logo_light_url", drop column "logo_dark_url";`);
  }
}
