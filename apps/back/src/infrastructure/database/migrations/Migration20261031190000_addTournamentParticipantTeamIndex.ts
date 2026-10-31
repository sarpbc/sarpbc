import { Migration } from "@mikro-orm/migrations";

export class Migration20261031190000_addTournamentParticipantTeamIndex extends Migration {
  override name = "Migration20261031190000_addTournamentParticipantTeamIndex";

  override up(): void | Promise<void> {
    this.addSql(
      `create index "tournament_participant_team_id_index" on "tournament_participant" ("team_id");`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`drop index "tournament_participant_team_id_index";`);
  }
}
