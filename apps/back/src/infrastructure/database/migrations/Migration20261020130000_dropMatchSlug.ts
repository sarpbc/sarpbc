import { Migration } from "@mikro-orm/migrations";

export class Migration20261020130000_dropMatchSlug extends Migration {
  override name = "Migration20261020130000_dropMatchSlug";

  override up() {
    this.addSql(`alter table "match" drop column "slug";`);
  }

  override down() {
    this.addSql(`alter table "match" add "slug" varchar(255) null;`);
  }
}
