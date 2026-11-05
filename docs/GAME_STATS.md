# Game stats pilot (SAR-21)

Stats fans leave a sarpbc.org match page for Ballchasing or Octane. The pilot shows per-game player stats on the match page for one pilot tournament. Success metric: the share of the pilot tournament's finished matches that have stats attached.

Scope: goals, saves, assists, shots and demolitions inflicted, per player and per game. Out of scope: automatic ingestion, rankings, fantasy, notifications and any other stat.

## Flow

1. A staff member with `tournaments.manage` (admins only) pastes a Ballchasing group link or id on the tournament page in the admin app.
2. `POST /tournaments/:id/stats-imports` records a `pending` import and returns `202`. The API then runs it in the same process. The admin page polls `GET /tournaments/:id/stats-imports` every 3 seconds while the import is `pending` or `running`.
3. The API lists the group's replays and the replays of every nested child group, page by page.
4. Each replay is matched to a game from the list metadata alone (see Matching). Only matched replays that are not already stored are requested in detail.
5. `GET /api/replays/{id}` returns the stats Ballchasing computed. The import fails a game when the request or the response validation fails (`fetch_failed`), when the replay's `status` is not `"ok"` (`replay_not_ready`), when its team goals differ from the list (`score_mismatch`), or when a team has no players (`player_mismatch`).
6. The game, one row per player and the platform links it teaches (see Players) are saved in a single transaction (`save_failed` otherwise).
7. The report lists every replay as imported, already imported, unmatched (with the reason) or failed (with the reason).

Running the same group again is safe. `match_game.ballchasing_id` is unique, and replays that are already stored are skipped before their details are requested.

## Matching

The matching code is pure domain code in `apps/back/src/match-stats/domain/replay-matching.ts`. The tests in the same folder cover name variants, substitutes, rematches, same-day series and ambiguous cases. A replay is attached only when every step below agrees. Otherwise it stays unmatched, with its reason.

- **Teams.** A replay side identifies a match participant when a majority of its players match the participant's tournament roster. A side with fewer known players also counts when the in-game team name matches the team and at least one player matches. Team names alone are enough only when the participant has no known roster. A side must not match the opposing roster. Names ignore case, accents and punctuation. Team tags around player names ("KC Vatira", "zen_rl") are tolerated. Team names also match by acronym ("KC" for Karmine Corp) or containment, ignoring words such as "Team" or "Esports".
- **Date.** The replay must fall between one hour before the match's `beginAt` and one hour after its `endAt`, or six hours after `beginAt` when there is no end. When the replay has no timezone, the window widens by 14 hours on each side. When several windows fit, as in an upper final and a grand final on the same day, the replay goes to the latest match whose `beginAt` has passed, so a late game of the upper final never moves to a grand final that has not begun. When none has begun, the one-hour early start cannot tell the matches apart and the replay is ambiguous. Equal start times are ambiguous, and so are overlapping windows when the replay date has no timezone.
- **Series.** Only finished matches with a recorded series score receive stats. A match is finished when its status is `finished` or it has an `endAt`, the same rule as the rest of the site. Replays placed on any other match are held back as `match_not_finished`, and a later run attaches them once the result is in. All replays placed on a match are ordered by date. The series is rejected when a replay ends in a draw, when there are more replays than the format allows, or when the game winners contradict the recorded score. With fewer replays than games in the score, the game order is unknown and the series is held back as `incomplete_series`. Game numbers follow date order, and a match holds one game per number. A match that already holds stats from other replays is never mixed (`match_has_other_stats`).
- **Duplicates.** Two uploads with the same Rocket League replay id keep the earlier one.
- **Players.** Every stat row keeps the in-game name, the platform and the platform id. It links to a sarpbc.org player in this order:
  1. A platform link (`player_platform_link`, unique on platform and platform id) wins, even when the player is not on the roster, which covers stand-ins.
  2. Otherwise, a single player on the participant's tournament roster whose name matches.
  3. Otherwise the row stays unlinked, and the match page shows the in-game name as plain text. Identity is never inferred by elimination.
- **Learning.** When step 2 links a row that has a platform id and no platform link exists yet, the import creates the link and links every earlier unlinked row of that account, in the game's transaction. An existing link is never replaced automatically, and a later name match that disagrees leaves it unchanged. The risk: a wrong unique name match teaches a wrong link, which then applies to every later import of that account. Staff correct it with the admin action below.
- **Renamed players.** The live import of the 2026 World Championship left 79 of 1,224 rows unlinked because Ballchasing's name differed from the roster: `justin.` (`jstn`), `Racer` (`kofyr`), `Aztr` (`AztromicK`), `Cata` (`Catalysm`) and `yan` (`yanxnz`), each with a known Steam id. Staff link them once in the admin app: under the tournament's stats import, "Unlinked players" lists each unlinked account of the tournament with its latest name, team, game count and that team's roster. Choosing a player from a roster of the tournament sets the account's link, replacing any previous one, and repoints every stat row of that account, in all tournaments, in one transaction.
- **Merges.** A player merge moves the duplicate's stat rows and platform links to the kept player in the merge transaction. Deleting a player deletes its platform links and unlinks its stat rows.

## Ballchasing API (SAR-37)

Facts from the [official API documentation](https://ballchasing.com/doc/api):

- **Authentication.** The `Authorization` header holds the raw key, with no `Bearer` prefix. The key comes from `BALLCHASING_API_KEY` and is never committed. Without a key the import endpoint answers with an actionable error.
- **Endpoints used.** `GET /api/groups/{id}` checks that the group exists. `GET /api/replays?group=&count=200` lists the replays directly in a group, and `GET /api/groups?group=&count=200` lists its child groups. Both follow the `next` link. `GET /api/replays/{id}` returns one replay's details and stats. A `next` link outside `https://ballchasing.com/api/` is refused, so the key never leaves that host.
- **List fields used.** For each replay: `id`, `rocket_league_id`, `replay_title`, `date`, `date_has_tz`, `blue`/`orange` `name` and `goals`, and the players' `name`. `goals` is absent when it is zero.
- **Detail fields used.** `status`, `<side>.stats.core.goals` for the team score, and for each player `name`, `id.platform`, `id.id`, `stats.core.goals`, `assists`, `saves`, `shots` and `stats.demo.inflicted` (stored as demolitions). The detail endpoint spells the timezone flag `date_has_timezone`, the list `date_has_tz`; the import only reads it from the list. Ballchasing omits some zero values, so a number missing inside a present stats object counts as 0. A player without `stats`, `stats.core` or `stats.demo`, or a team without `stats.core`, fails the game with `fetch_failed` rather than storing a false zero.
- **Source check.** On 5 games compared during a live test, all 125 values (five stats for every player) were identical between the boxcars parser this PR first used and `GET /api/replays/{id}`, demolitions included.
- **Rate limits** (calls per second, then per hour where capped):

| Endpoint                   | Regular          | Gold               | Diamond            | Champion    | Grand Champion |
| -------------------------- | ---------------- | ------------------ | ------------------ | ----------- | -------------- |
| `GET /replays` (list)      | 2/s, 500/h       | 2/s, 1,000/h       | 4/s, 2,000/h       | 8/s         | 16/s           |
| `GET /replays/{id}`        | 2/s, 1,000/h     | not checked        | not checked        | not checked | not checked    |
| `GET /groups`, `/groups/x` | 2/s, 500–1,000/h | 2/s, 1,000–2,000/h | 4/s, 2,000–5,000/h | 8/s         | 16/s           |

The client spaces calls for the regular tier: 500 ms between calls of each kind (list, group, replay details). On `429` it waits for a positive `Retry-After`. A missing or `0` value gets an exponential backoff instead: 1 second, then doubling up to five retries (1, 2, 4, 8 and 16 seconds), capped at 30 seconds. After the fifth retry the game fails with `fetch_failed`, and the report keeps going. Rerunning resumes where it stopped.

One detail call per game makes 1,000 calls an hour enough for about 200 best-of-5 series on the regular tier, before the list and group calls, which have their own limits. A tournament above that needs a second run after the hour, or a patron key.

The `429` behaviour that motivated this choice was measured on the replay file endpoint (`GET /replays/{id}/file`), on the regular tier, during the live test: from about the third file it answered `429` with `retry-after: 0`, and the earlier flat 60-second cooldown gave about 54 files an hour. The detail endpoint's behaviour under load has not been measured.

- **Replay availability (RLCS).** Ballchasing has only what someone uploaded. Nothing guarantees that a tournament's replays exist, or when they appear, and this pilot has not checked a real RLCS group. Groups can be private, and a private group answers `404` to other keys. The pilot therefore relies on a staff member finding or building one group per tournament. Ballchasing's "pro" tag is never used.

## Storage

No specialised database is needed. Volumes are tiny: a 3v3 game is six rows, and a full RLCS split is a few thousand. Aggregates such as per-player totals, averages per game, or per tournament are plain SQL `SUM`/`GROUP BY` over integer columns, with indexes on `match_id`, `game_id` and `player_id`. The pilot uses the existing PostgreSQL and MikroORM:

- `match_game`: one row per game. It holds the match, the game number (unique within the match), the unique `ballchasing_id`, `rocket_league_id`, `played_at`, the blue and orange participants and the score. It cascades with its match.
- `match_game_player`: one row per player per game. It holds the side, the in-game name, the platform and platform id, a nullable `player_id` (set to null if the player is deleted) and five integer columns.
- `player_platform_link`: one row per game account (`platform`, `platform_id`, unique together) with its `player_id`. It cascades with the player. The `player` table itself stores no platform id.
- `match_stats_import`: one row per staff request. It holds the status, the progress and the JSON report of the import. The report is an operational log, not queryable stats.

Match games were not modelled before. The match only stored the series score and per-game VOD links in JSON. This replaces SAR-38's `MatchReplay.statsJson` blob with relational rows, so the stats can be aggregated later without a migration.

## Replay files (removed parser)

This PR first downloaded each `.replay` file and parsed it with a Rust CLI built on [boxcars](https://github.com/nickbabcock/boxcars) (`apps/back/replay-parser`, with a `ReplayParser` port and a `BoxcarsReplayParser` adapter). The owner replaced it after the live test: file downloads were the bottleneck, and Ballchasing's own stats matched the parser on every value compared. The parser, its Docker stage and its CI job were removed. If replay files are ever needed again, for a stat Ballchasing does not compute, restore the parser from git history (PR #242, introduced in commit `a4bf6537`).

## Display and licensing

The match page shows a "Game Stats" section when a match has imported games, with a game switcher and a link to each replay on Ballchasing for attribution. Without games, the page is unchanged. A linked row shows the sarpbc.org player's name with a link to their profile, not the in-game name. The stats ride on the existing `GET /matches/:ref` response used by the site, which carries no platform ids. They are not exposed through MCP or any other API. In line with SAR-168, no Epic assets are used, and Liquipedia and BLAST.tv are never sources.

## Linear mapping

| Issue  | Status in this PR                                                                                                                                                |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SAR-37 | This document.                                                                                                                                                   |
| SAR-38 | Relational `match_game` and `match_game_player` tables instead of `MatchReplay.statsJson`.                                                                       |
| SAR-39 | Replaced by the tournament group import. It keeps the admin-only guard, the pending, running, completed and failed statuses, a per-replay report and en/fr copy. |
| SAR-41 | Stats table on the match page, Ballchasing attribution, en/fr copy. Loading and error states are the page's own, because the stats arrive with the match.        |
| SAR-42 | Not done. The pilot runbook comes next.                                                                                                                          |

## What remains

- A live import of the 2026 World Championship stored 1,224 player rows, 79 of them unlinked, which motivated platform links. Platform links have not yet been exercised against that live data.
- SAR-42 pilot runbook: choose the tournament, build or find its group, run the import, review unmatched replays and measure coverage.
- Possible later work: an in-app retry for a single replay, manual attachment of an unmatched replay, automatic ingestion, and aggregated player stats.
