# Game stats pilot (SAR-21)

Stats fans leave a sarpbc.org match page for Ballchasing or Octane. The pilot shows per-game player stats on the match page for one pilot tournament. Success metric: the share of the pilot tournament's finished matches that have stats attached.

Scope: goals, saves, assists, shots and demolitions inflicted, per player and per game. Out of scope: automatic ingestion, rankings, fantasy, notifications and any other stat.

## Flow

1. A staff member with `tournaments.manage` (admins only) pastes a Ballchasing group link or id on the tournament page in the admin app.
2. `POST /tournaments/:id/stats-imports` records a `pending` import and returns `202`. The API then runs it in the same process. The admin page polls `GET /tournaments/:id/stats-imports` every 3 seconds while the import is `pending` or `running`.
3. The API lists the group's replays and the replays of every nested child group, page by page.
4. Each replay is matched to a game from Ballchasing's metadata alone (see Matching). Only matched replays that are not already stored are downloaded.
5. The `replay-parser` binary reads the `.replay` file. The import fails a game when the file's score differs from Ballchasing's, or when a team is missing.
6. The game and one row per player are saved in a single transaction.
7. The report lists every replay as imported, already imported, unmatched (with the reason) or failed (with the reason).

Running the same group again is safe. `match_game.ballchasing_id` is unique, and replays that are already stored are skipped before download.

## Matching

The matching code is pure domain code in `apps/back/src/match-stats/domain/replay-matching.ts`. The tests in the same folder cover name variants, substitutes, rematches, same-day series and ambiguous cases. A replay is attached only when every step below agrees. Otherwise it stays unmatched, with its reason.

- **Teams.** A replay side identifies a match participant when a majority of its players match the participant's tournament roster. A side with fewer known players also counts when the in-game team name matches the team and at least one player matches. Team names alone are enough only when the participant has no known roster. A side must not match the opposing roster. Names ignore case, accents and punctuation. Team tags around player names ("KC Vatira", "zen_rl") are tolerated. Team names also match by acronym ("KC" for Karmine Corp) or containment, ignoring words such as "Team" or "Esports".
- **Date.** The replay must fall between one hour before the match's `beginAt` and one hour after its `endAt`, or six hours after `beginAt` when there is no end. When the replay has no timezone, the window widens by 14 hours on each side. When several windows fit, as in an upper final and a grand final on the same day, the replay goes to the latest match already started. Equal start times are ambiguous, and so are overlapping windows when the replay date has no timezone.
- **Series.** All replays placed on a match are ordered by date. The series is rejected when a replay ends in a draw, when there are more replays than the format allows, or when the game winners contradict the recorded score. With fewer replays than games in the score, the game order is unknown and the series is held back as `incomplete_series`. Game numbers follow date order. A match that already holds stats from other replays is never mixed (`match_has_other_stats`).
- **Duplicates.** Two uploads with the same Rocket League replay id keep the earlier one.
- **Players.** A stat row links to a sarpbc.org player when exactly one player on the participant's tournament roster matches. Otherwise the row keeps the in-game name, the platform and the platform id with no player link. Substitutes therefore keep their stats. A player merge moves the duplicate's stat rows to the kept player in the merge transaction.

## Ballchasing API (SAR-37)

Facts from the [official API documentation](https://ballchasing.com/doc/api):

- **Authentication.** The `Authorization` header holds the raw key, with no `Bearer` prefix. The key comes from `BALLCHASING_API_KEY` and is never committed. Without a key the import endpoint answers with an actionable error.
- **Endpoints used.** `GET /api/groups/{id}` checks that the group exists. `GET /api/replays?group=&count=200` lists the replays directly in a group, and `GET /api/groups?group=&count=200` lists its child groups. Both follow the `next` link. `GET /api/replays/{id}/file` downloads a replay. A `next` link outside `https://ballchasing.com/api/` is refused, so the key never leaves that host.
- **Fields used.** For each replay: `id`, `rocket_league_id`, `replay_title`, `date`, `date_has_tz`, `blue`/`orange` `name` and `goals`, and the players' `name`. `goals` is absent when it is zero.
- **Rate limits** (calls per second, then per hour where capped):

| Endpoint                   | Regular          | Gold               | Diamond            | Champion     | Grand Champion |
| -------------------------- | ---------------- | ------------------ | ------------------ | ------------ | -------------- |
| `GET /replays` (list)      | 2/s, 500/h       | 2/s, 1,000/h       | 4/s, 2,000/h       | 8/s          | 16/s           |
| `GET /replays/{id}/file`   | **1/s, 200/h**   | 2/s, 400/h         | 2/s, 1,000/h       | 2/s, 2,000/h | 2/s            |
| `GET /groups`, `/groups/x` | 2/s, 500–1,000/h | 2/s, 1,000–2,000/h | 4/s, 2,000–5,000/h | 8/s          | 16/s           |

The client spaces calls for the regular tier: 500 ms between list and group calls and one second between downloads. On `429` it waits for `Retry-After`, or 60 seconds without one, up to five times, then fails that game. Rerunning resumes where it stopped. On the regular tier, 200 downloads per hour is about 40 best-of-5 series. A larger tournament needs several runs, or a patron key.

- **Replay availability (RLCS).** Ballchasing has only what someone uploaded. Nothing guarantees that a tournament's replays exist, or when they appear, and this pilot has not checked a real RLCS group. Groups can be private, and a private group answers `404` to other keys. The pilot therefore relies on a staff member finding or building one group per tournament. Ballchasing's "pro" tag is never used.

## Storage

No specialised database is needed. Volumes are tiny: a 3v3 game is six rows, and a full RLCS split is a few thousand. Aggregates such as per-player totals, averages per game, or per tournament are plain SQL `SUM`/`GROUP BY` over integer columns, with indexes on `match_id`, `game_id` and `player_id`. The pilot uses the existing PostgreSQL and MikroORM:

- `match_game`: one row per game. It holds the match, the game number, the unique `ballchasing_id`, `rocket_league_id`, `played_at`, the blue and orange participants and the score. It cascades with its match.
- `match_game_player`: one row per player per game. It holds the side, the in-game name, the platform and platform id, a nullable `player_id` (set to null if the player is deleted) and five integer columns.
- `match_stats_import`: one row per staff request. It holds the status, the progress and the JSON report of the import. The report is an operational log, not queryable stats.

Match games were not modelled before. The match only stored the series score and per-game VOD links in JSON. This replaces SAR-38's `MatchReplay.statsJson` blob with relational rows, so the stats can be aggregated later without a migration.

## Replay parsing

`apps/back/replay-parser` is a small Rust CLI built on [boxcars](https://github.com/nickbabcock/boxcars). It reads one replay and prints JSON. The API runs it as a child process through the `ReplayParser` application port, so a parser crash fails one game instead of the API. The Docker image builds it in a separate stage and installs it on `PATH`. CI checks its format and lint, runs its tests and builds it before the backend tests, which then parse the committed fixture through the adapter.

The header's `PlayerStats` provide goals, assists, saves and shots. Demolitions are not in the header. The parser counts them from network frames, deduplicates repeated replications and credits the attacker's player. The method is described in the [parser README](../apps/back/replay-parser/README.md). The count matched the game's own counter for every player in all 23 boxcars sample replays that carry it.

## Display and licensing

The match page shows a "Game Stats" section when a match has imported games, with a game switcher and a link to each replay on Ballchasing for attribution. Without games, the page is unchanged. The stats ride on the existing `GET /matches/:ref` response used by the site. They are not exposed through MCP or any other API. In line with SAR-168, no Epic assets are used, and Liquipedia and BLAST.tv are never sources.

## Linear mapping

| Issue  | Status in this PR                                                                                                                                                |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SAR-37 | This document.                                                                                                                                                   |
| SAR-38 | Relational `match_game` and `match_game_player` tables instead of `MatchReplay.statsJson`.                                                                       |
| SAR-39 | Replaced by the tournament group import. It keeps the admin-only guard, the pending, running, completed and failed statuses, a per-replay report and en/fr copy. |
| SAR-41 | Stats table on the match page, Ballchasing attribution, en/fr copy. Loading and error states are the page's own, because the stats arrive with the match.        |
| SAR-42 | Not done. The pilot runbook comes next.                                                                                                                          |

## What remains

- A live run. The client has only been tested against fake responses written from the documentation. It has never called the real API.
- SAR-42 pilot runbook: choose the tournament, build or find its group, run the import, review unmatched replays and measure coverage.
- Possible later work: an in-app retry for a single replay, manual attachment of an unmatched replay, automatic ingestion, and aggregated player stats.
