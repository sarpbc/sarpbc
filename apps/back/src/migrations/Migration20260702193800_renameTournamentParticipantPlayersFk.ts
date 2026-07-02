import { Migration } from "@mikro-orm/migrations";

export class Migration20260702193800_renameTournamentParticipantPlayersFk extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "tournament_participant_players" rename constraint "tournament_participant_players_tournament_partic_7dcf5_foreign" to "tournament_participant_players_tournament_partic_f2b12_foreign";`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "tournament_participant_players" rename constraint "tournament_participant_players_tournament_partic_f2b12_foreign" to "tournament_participant_players_tournament_partic_7dcf5_foreign";`,
    );
  }
}
