import { Migration } from "@mikro-orm/migrations";

export class Migration20260810221713_addPlayerAward extends Migration {
  override name = "Migration20260810221713_addPlayerAward";

  override up(): void | Promise<void> {
    this.addSql(
      `create table "player_award" ("id" uuid not null default gen_random_uuid(), "tournament_id" varchar(255) not null, "participant_id" varchar(255) not null, "player_id" uuid not null, "award_type" text not null, "created_at" timestamptz not null default now(), primary key ("id"));`,
    );
    this.addSql(
      `alter table "player_award" add constraint "player_award_tournament_id_award_type_unique" unique ("tournament_id", "award_type");`,
    );

    this.addSql(
      `alter table "player_award" add constraint "player_award_tournament_id_foreign" foreign key ("tournament_id") references "tournament" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "player_award" add constraint "player_award_participant_id_foreign" foreign key ("participant_id") references "tournament_participant" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "player_award" add constraint "player_award_player_id_foreign" foreign key ("player_id") references "player" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "player_award" add constraint "player_award_award_type_check" check ("award_type" in ('mvp'));`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "player_award" cascade;`);
  }
}
