import { Migration } from "@mikro-orm/migrations";

export class Migration20261031170000_addTournamentPrize extends Migration {
  override name = "Migration20261031170000_addTournamentPrize";

  override up(): void | Promise<void> {
    this.addSql(
      `create table "tournament_prize" ("id" uuid not null default gen_random_uuid(), "tournament_id" varchar(255) not null, "placement" int not null, "amount" int not null, "currency" text not null, "team_id" uuid not null, "created_at" timestamptz not null default now(), primary key ("id"));`,
    );
    this.addSql(
      `alter table "tournament_prize" add constraint "tournament_prize_tournament_id_team_id_unique" unique ("tournament_id", "team_id");`,
    );
    this.addSql(
      `create table "tournament_prize_players" ("tournament_prize_id" uuid not null, "player_id" uuid not null, primary key ("tournament_prize_id", "player_id"));`,
    );

    this.addSql(
      `alter table "tournament_prize" add constraint "tournament_prize_tournament_id_foreign" foreign key ("tournament_id") references "tournament" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "tournament_prize" add constraint "tournament_prize_team_id_foreign" foreign key ("team_id") references "team" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "tournament_prize_players" add constraint "tournament_prize_players_tournament_prize_id_foreign" foreign key ("tournament_prize_id") references "tournament_prize" ("id") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "tournament_prize_players" add constraint "tournament_prize_players_player_id_foreign" foreign key ("player_id") references "player" ("id") on update cascade on delete cascade;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "tournament_prize_players" cascade;`);
    this.addSql(`drop table if exists "tournament_prize" cascade;`);
  }
}
