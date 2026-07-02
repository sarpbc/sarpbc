import { Migration } from "@mikro-orm/migrations";

export class Migration20260702214556 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `alter table "tournament_participant_players" drop constraint "tournament_participant_players_tournament_partic_f2b12_foreign";`,
    );

    this.addSql(
      `alter table "air_riddle" alter column "created_at" type timestamptz using ("created_at"::timestamptz);`,
    );

    this.addSql(
      `alter table "league" alter column "created_at" type timestamptz using ("created_at"::timestamptz);`,
    );
    this.addSql(
      `alter table "league" alter column "modified_at" type timestamptz using ("modified_at"::timestamptz);`,
    );
    this.addSql(
      `alter table "league" alter column "updated_at" type timestamptz using ("updated_at"::timestamptz);`,
    );

    this.addSql(
      `alter table "tournament" alter column "begin_at" type timestamptz using ("begin_at"::timestamptz);`,
    );
    this.addSql(
      `alter table "tournament" alter column "created_at" type timestamptz using ("created_at"::timestamptz);`,
    );
    this.addSql(
      `alter table "tournament" alter column "end_at" type timestamptz using ("end_at"::timestamptz);`,
    );
    this.addSql(
      `alter table "tournament" alter column "updated_at" type timestamptz using ("updated_at"::timestamptz);`,
    );

    this.addSql(
      `alter table "tournament_participant" alter column "created_at" type timestamptz using ("created_at"::timestamptz);`,
    );
    this.addSql(
      `alter table "tournament_participant" alter column "updated_at" type timestamptz using ("updated_at"::timestamptz);`,
    );

    this.addSql(
      `alter table "tournament_participant_players" add constraint "tournament_participant_players_foreign_tournament_part_5cea64eb" foreign key ("tournament_participant_id") references "tournament_participant" ("id") on update cascade on delete cascade;`,
    );

    this.addSql(
      `alter table "pickem_choice" alter column "created_at" type timestamptz using ("created_at"::timestamptz);`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table "tournament_participant_players" drop constraint "tournament_participant_players_foreign_tournament_part_5cea64eb";`,
    );

    this.addSql(
      `alter table "air_riddle" alter column "created_at" type date using ("created_at"::date);`,
    );

    this.addSql(
      `alter table "league" alter column "modified_at" type date using ("modified_at"::date);`,
    );
    this.addSql(
      `alter table "league" alter column "created_at" type date using ("created_at"::date);`,
    );
    this.addSql(
      `alter table "league" alter column "updated_at" type date using ("updated_at"::date);`,
    );

    this.addSql(
      `alter table "pickem_choice" alter column "created_at" type date using ("created_at"::date);`,
    );

    this.addSql(
      `alter table "tournament" alter column "begin_at" type date using ("begin_at"::date);`,
    );
    this.addSql(`alter table "tournament" alter column "end_at" type date using ("end_at"::date);`);
    this.addSql(
      `alter table "tournament" alter column "created_at" type date using ("created_at"::date);`,
    );
    this.addSql(
      `alter table "tournament" alter column "updated_at" type date using ("updated_at"::date);`,
    );

    this.addSql(
      `alter table "tournament_participant" alter column "created_at" type date using ("created_at"::date);`,
    );
    this.addSql(
      `alter table "tournament_participant" alter column "updated_at" type date using ("updated_at"::date);`,
    );

    this.addSql(
      `alter table "tournament_participant_players" add constraint "tournament_participant_players_tournament_partic_f2b12_foreign" foreign key ("tournament_participant_id") references "tournament_participant" ("id") on update cascade on delete cascade;`,
    );
  }
}
