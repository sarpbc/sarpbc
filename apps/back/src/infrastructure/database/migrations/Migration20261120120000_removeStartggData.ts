import { Migration } from "@mikro-orm/migrations";

const STARTGG_URL = String.raw`'^https?://([^/@]*\.)?start\.gg(:[0-9]+)?([/?#]|$)'`;

const withoutStartggStreams = (table: string) =>
  `update "${table}" set "streams" = coalesce((select jsonb_agg(s) from jsonb_array_elements("streams") s where s->>'source' <> 'startgg'), '[]'::jsonb) where "streams" @> '[{"source":"startgg"}]';`;

const snapshot = (name: string, query: string) =>
  `create temporary table "${name}" on commit drop as ${query};`;

// WARNING: migrations run with foreign keys disabled, so cascades and set-null rules never fire: every dependent row is handled here.
export class Migration20261120120000_removeStartggData extends Migration {
  override name = "Migration20261120120000_removeStartggData";

  override up() {
    this.addSql(
      snapshot(
        "gone_tournament",
        `select "id", "event_id" from "tournament" where "source" = 'startgg'`,
      ),
    );
    this.addSql(
      snapshot(
        "gone_match",
        `select "id" from "match" where "source" = 'startgg' or "tournament_id" in (select "id" from "gone_tournament")`,
      ),
    );
    this.addSql(
      snapshot(
        "gone_participant",
        `select "id" from "tournament_participant" where "tournament_id" in (select "id" from "gone_tournament")`,
      ),
    );
    this.addSql(
      snapshot(
        "gone_game",
        `select "id" from "match_game" where "match_id" in (select "id" from "gone_match")`,
      ),
    );
    this.addSql(
      snapshot(
        "gone_reply",
        `select "id" from "reply" where "match_id" in (select "id" from "gone_match")`,
      ),
    );
    this.addSql(
      snapshot(
        "gone_prize",
        `select "id" from "tournament_prize" where "tournament_id" in (select "id" from "gone_tournament")`,
      ),
    );
    this.addSql(
      snapshot(
        "gone_circuit_stage",
        `select "id" from "circuit_stage" where "tournament_id" in (select "id" from "gone_tournament")`,
      ),
    );

    this.addSql(
      `delete from "reply_notification" where "reply_id" in (select "id" from "gone_reply");`,
    );
    this.addSql(`delete from "reply_report" where "reply_id" in (select "id" from "gone_reply");`);
    this.addSql(
      `update "reply" set "reply_to_id" = null where "reply_to_id" in (select "id" from "gone_reply");`,
    );
    this.addSql(`delete from "reply" where "id" in (select "id" from "gone_reply");`);
    this.addSql(`delete from "pickem_choice" where "match_id" in (select "id" from "gone_match");`);
    this.addSql(
      `delete from "bracket_link" where "match_id" in (select "id" from "gone_match") or "previous_match_id" in (select "id" from "gone_match");`,
    );
    this.addSql(`delete from "match_result" where "match_id" in (select "id" from "gone_match");`);
    this.addSql(
      `delete from "match_game_player" where "game_id" in (select "id" from "gone_game");`,
    );
    this.addSql(`delete from "match_game" where "id" in (select "id" from "gone_game");`);
    this.addSql(
      `delete from "match_lineup_player" where "match_id" in (select "id" from "gone_match") or "participant_id" in (select "id" from "gone_participant");`,
    );
    this.addSql(
      `delete from "match_participants" where "match_id" in (select "id" from "gone_match") or "tournament_participant_id" in (select "id" from "gone_participant");`,
    );
    this.addSql(
      `update "on_this_day_fact" set "match_id" = null where "match_id" in (select "id" from "gone_match");`,
    );
    this.addSql(`delete from "match" where "id" in (select "id" from "gone_match");`);

    this.addSql(
      `delete from "player_award" where "tournament_id" in (select "id" from "gone_tournament");`,
    );
    this.addSql(
      `delete from "tournament_prize_players" where "tournament_prize_id" in (select "id" from "gone_prize");`,
    );
    this.addSql(`delete from "tournament_prize" where "id" in (select "id" from "gone_prize");`);
    this.addSql(
      `delete from "circuit_stage_team" where "stage_id" in (select "id" from "gone_circuit_stage");`,
    );
    this.addSql(
      `delete from "circuit_stage" where "id" in (select "id" from "gone_circuit_stage");`,
    );
    this.addSql(
      `delete from "match_stats_import" where "tournament_id" in (select "id" from "gone_tournament");`,
    );
    this.addSql(
      `update "season_path_entry" set "tournament_id" = null where "tournament_id" in (select "id" from "gone_tournament");`,
    );
    this.addSql(
      `update "on_this_day_fact" set "tournament_id" = null where "tournament_id" in (select "id" from "gone_tournament");`,
    );
    this.addSql(
      `delete from "tournament_participant_players" where "tournament_participant_id" in (select "id" from "gone_participant");`,
    );
    this.addSql(
      `delete from "tournament_participant" where "id" in (select "id" from "gone_participant");`,
    );
    this.addSql(`delete from "tournament" where "id" in (select "id" from "gone_tournament");`);
    this.addSql(
      `delete from "tournament_event" e where e."id" in (select "event_id" from "gone_tournament") and not exists (select 1 from "tournament" t where t."event_id" = e."id");`,
    );

    this.addSql(withoutStartggStreams("match"));
    this.addSql(withoutStartggStreams("tournament"));
    this.addSql(withoutStartggStreams("tournament_event"));

    this.addSql(
      `delete from "roster_proposal" where "status" = 'pending' and "source_url" ~* ${STARTGG_URL};`,
    );

    this.addSql(
      snapshot(
        "gone_player",
        `select p."id" from "player" p where p."source" = 'startgg'
          and not exists (select 1 from "contract" c where c."player_id" = p."id")
          and not exists (select 1 from "tournament_participant_players" r where r."player_id" = p."id")
          and not exists (select 1 from "match_lineup_player" l where l."player_id" = p."id")
          and not exists (select 1 from "tournament_prize_players" r where r."player_id" = p."id")
          and not exists (select 1 from "player_award" a where a."player_id" = p."id")
          and not exists (select 1 from "season_award" a where a."player_id" = p."id")
          and not exists (select 1 from "player_photo" f where f."player_id" = p."id")
          and not exists (select 1 from "on_this_day_fact" f where f."player_id" = p."id")
          and not exists (select 1 from "player" d where d."merged_into_id" = p."id")`,
      ),
    );
    this.addSql(
      `delete from "player_platform_link" where "player_id" in (select "id" from "gone_player");`,
    );
    this.addSql(
      `update "match_game_player" set "player_id" = null where "player_id" in (select "id" from "gone_player");`,
    );
    this.addSql(`delete from "player" where "id" in (select "id" from "gone_player");`);
    this.addSql(`update "player" set "source" = 'manual' where "source" = 'startgg';`);

    this.addSql(
      snapshot(
        "gone_team",
        `select t."id" from "team" t where t."source" = 'startgg'
          and not exists (select 1 from "player" p where p."team_id" = t."id")
          and not exists (select 1 from "contract" c where c."team_id" = t."id")
          and not exists (select 1 from "tournament_participant" r where r."team_id" = t."id")
          and not exists (select 1 from "tournament_prize" r where r."team_id" = t."id")
          and not exists (select 1 from "season_participant" s where s."team_id" = t."id")
          and not exists (select 1 from "season" s where s."winner_team_id" = t."id")
          and not exists (select 1 from "circuit_stage_team" s where s."team_id" = t."id")
          and not exists (select 1 from "on_this_day_fact" f where f."team_id" = t."id")
          and not exists (select 1 from "team" d where d."merged_into_id" = t."id")`,
      ),
    );
    this.addSql(`delete from "team_alias" where "team_id" in (select "id" from "gone_team");`);
    this.addSql(`delete from "team" where "id" in (select "id" from "gone_team");`);
    this.addSql(`update "team" set "source" = 'manual' where "source" = 'startgg';`);
  }
}
