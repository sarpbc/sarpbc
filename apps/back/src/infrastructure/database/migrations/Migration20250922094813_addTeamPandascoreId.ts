import { Migration } from "@mikro-orm/migrations";

export class Migration20250922094813_addTeamPandascoreId extends Migration {
  override async up() {
    this.addSql(`alter table "team" add column "pandascore_id" int null;`);
  }

  override async down() {
    this.addSql(`alter table "team" drop column "pandascore_id";`);
  }
}
