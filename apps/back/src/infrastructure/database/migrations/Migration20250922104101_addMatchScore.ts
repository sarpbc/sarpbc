import { Migration } from "@mikro-orm/migrations";

export class Migration20250922104101_addMatchScore extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "match_result" ("id" varchar(255) not null, "match_id" varchar(255) not null, "participant_id" varchar(255) not null, "score" int not null, constraint "match_result_pkey" primary key ("id"));`,
    );
    this.addSql(
      `alter table "match_result" add constraint "match_result_match_id_participant_id_unique" unique ("match_id", "participant_id");`,
    );

    this.addSql(
      `alter table "match_result" add constraint "match_result_match_id_foreign" foreign key ("match_id") references "match" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "match_result" add constraint "match_result_participant_id_foreign" foreign key ("participant_id") references "tournament_participant" ("id") on update cascade;`,
    );

    this.addSql(`alter table "match" drop column "results";`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "match_result" cascade;`);

    this.addSql(`alter table "match" add column "results" jsonb null;`);
  }
}
