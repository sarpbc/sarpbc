# MCP server

Staff AI assistants can call the sarpbc.org API through a [Model Context Protocol](https://modelcontextprotocol.io) server mounted on the NestJS backend.

|               |                                                                                                          |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| **Endpoint**  | `https://api.sarpbc.org/mcp` (local: `http://localhost:4001/mcp`)                                        |
| **Transport** | Stateless Streamable HTTP (`POST` only)                                                                  |
| **Auth**      | Personal access token from the admin app → **Tokens** (`/tokens`). Send `Authorization: Bearer <token>`. |

## Client configuration

Add the server to your MCP client's configuration:

```json
{
  "mcpServers": {
    "sarpbc": {
      "url": "https://api.sarpbc.org/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_PAT_HERE"
      }
    }
  }
}
```

## Tools

Every tool ends its description with the permission it requires and is refused before it runs when the token's role lacks it. A player or team given as `idOrSlug`, or in `create_match` `teams`, is read as an id first when it is a UUID, then as a slug; any other value is a slug. Tool failures are logged with the tool name and user. A refusal the application words for staff (not found, invalid input, conflict) is returned as the tool error; any other failure returns a generic message and its detail stays in the server log.

Read tools (any valid PAT):

| Tool                    | Description                                     |
| ----------------------- | ----------------------------------------------- |
| `search_players`        | Search players by name                          |
| `search_teams`          | Search teams by name                            |
| `get_player`            | Player profile by slug or id                    |
| `list_contracts`        | A player's contracts, oldest first, with roles  |
| `get_team`              | Team profile and roster by slug or id           |
| `get_tournaments`       | List tournaments (`activeOnly`, `limit`)        |
| `get_tournament`        | Tournament detail with matches and participants |
| `get_upcoming_matches`  | Upcoming and live matches                       |
| `get_match_results`     | Recent finished match results                   |
| `get_tournament_prizes` | Prize distribution of a tournament stage        |
| `get_match_lineups`     | Players who played each side of a match         |
| `get_team_earnings`     | Team earnings by year, per currency             |
| `get_player_earnings`   | Player earnings by year, per currency           |
| `list_leagues`          | Leagues with id, name, slug and source          |
| `list_events`           | Events, newest first, with their stages         |
| `get_event`             | Event by id or slug with its stages and league  |
| `list_circuits`         | Points circuits with their public URL           |
| `get_circuit`           | Circuit stages, scales and computed standings   |

News tools (`news.manage`):

| Tool                  | Description                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| `list_news_articles`  | List articles including drafts                                                                   |
| `get_news_article`    | Full EN/FR article by slug or id                                                                 |
| `create_news_draft`   | EN/FR news draft using `:player` / `:team` / `:tweet` / `:matches` MDC tags (human must publish) |
| `update_news_article` | Patch an existing article (does not publish)                                                     |

Write tools (staff permission required):

| Tool                         | Permission           | Description                                                                              |
| ---------------------------- | -------------------- | ---------------------------------------------------------------------------------------- |
| `create_match`               | `tournaments.manage` | Create a match from participant ids and/or team ids or slugs                             |
| `set_match_winner`           | `tournaments.manage` | Set match winner by participant id                                                       |
| `update_match`               | `tournaments.manage` | Correct score, status or dates of a manual match                                         |
| `set_match_game_vods`        | `tournaments.manage` | Replace the Twitch/YouTube VOD links of one game, with their ISO 639-1 language          |
| `trigger_tournament_sync`    | `tournaments.manage` | Sync one tournament or PandaScore additions                                              |
| `create_tournament`          | `tournaments.manage` | Create a manual tournament, as a stage of an existing event or with an event of its own  |
| `update_tournament`          | `tournaments.manage` | Edit a manual tournament; on a synced one, only the image and an end date the sync keeps |
| `link_pandascore_tournament` | `tournaments.manage` | Turn a manual tournament into its PandaScore stage instead of importing a duplicate      |
| `sync_pandascore_tournament` | `tournaments.manage` | Import or refresh a tournament by its PandaScore id                                      |
| `create_league`              | `tournaments.manage` | Create a league for manual events and tournaments                                        |
| `update_league`              | `tournaments.manage` | Update a league; PandaScore leagues accept `imageUrl` only                               |
| `create_event`               | `tournaments.manage` | Create an empty manual event, then attach tournaments with `eventId`                     |
| `update_event`               | `tournaments.manage` | Rename a manual event or change its slug or league; synced events are rejected           |

Game stats tools (`tournaments.manage`). They operate the Ballchasing stats pipeline described in [GAME_STATS.md](GAME_STATS.md) through the same application services as the admin app. They are staff tools and do not make the stats public; no public or read-only tool returns stats or platform ids.

| Tool                         | Input                                                                  | Description                                                                                                        |
| ---------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `import_game_stats`          | `tournamentId`, `group`                                                | Start an import from a Ballchasing group link or id; returns its `id` and `status` (`pending`)                     |
| `get_game_stats_import`      | `tournamentId`, `includeOtherStages?`                                  | Latest import: status, progress, counts per outcome and the replays to review                                      |
| `list_unlinked_game_players` | `tournamentId`, `includeLinked?`                                       | Game accounts without a sarpbc.org player (all accounts with `includeLinked`), plus every roster of the tournament |
| `link_game_player`           | `tournamentId`, `platform`, `platformId`, `playerId`                   | Link an account to a player of any roster of the tournament and repoint all its stat rows                          |
| `attach_replay_to_game`      | `tournamentId`, `matchId`, `replay`, `gameNumber`, `blueParticipantId` | Staff override: attach a Ballchasing replay link or id to one game of a match                                      |
| `remove_match_game`          | `tournamentId`, `matchId`, `gameNumber`                                | Remove one game and its player rows; later imports report its replay as `excluded_by_staff`                        |

`get_game_stats_import` keeps a large group readable: replays of other stages (`unknown_teams`, `outside_match_window`) are only counted in `otherStages`, and `toReview` lists the other unmatched and failed replays with their `matchId`, `blueParticipantId` and reason. Pass `includeOtherStages: true` to list them in `otherStageReplays`. A typical run: `import_game_stats`, poll `get_game_stats_import` until `completed` or `failed`, fix a misplaced or refused replay with `remove_match_game` and `attach_replay_to_game`, then link renamed players with `list_unlinked_game_players` and `link_game_player`. `attach_replay_to_game` skips the import's team, date and series rules but refuses a match outside the tournament, a blue team outside the match, a game number out of range or already used, a replay already attached (the error says where) and a replay Ballchasing has not processed.

Roster tools (staff permission and a public `sourceUrl` required). They only queue a proposal: nothing changes until a staff member with the same permission approves it in admin → **Roster proposals** (`/proposals`). A failed approval leaves the proposal pending. Nothing is physically deleted: roster moves close the open contract and record the join and departure sources, teams are marked inactive instead of removed, and merged duplicates stay as redirects.

| Tool                        | Permission                                               | Description once approved                                                                                      |
| --------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `add_player_to_team`        | `players.manage`                                         | Close the player's open contracts and open one with the new team and contract role                             |
| `remove_player_from_team`   | `players.manage`                                         | Close the contract and set the player `free_agent` or `retired`                                                |
| `create_player`             | `players.manage`                                         | Create a player without a team (name, country, status)                                                         |
| `update_player`             | `players.manage`                                         | Update name, country or status (`active`, `free_agent`, `retired`)                                             |
| `create_team`               | `teams.manage`                                           | Create a team (name, country, logo)                                                                            |
| `update_team`               | `teams.manage`                                           | Update name, country or logo, or mark an empty team inactive                                                   |
| `upload_team_logo`          | `teams.manage`                                           | Set the team's `light` or `dark` logo variant from an official asset stored on sarpbc.org                      |
| `create_contract`           | `players.manage`                                         | Record a dated contract in a player's career, such as a past stint                                             |
| `update_contract`           | `players.manage`                                         | Correct a contract's team, dates or role, or reopen it                                                         |
| `merge_players`             | `players.manage`                                         | Move a duplicate's contracts, photos, awards and tournament rosters to the kept player                         |
| `merge_teams`               | `teams.manage`                                           | Move a duplicate's contracts, current players and tournament participations to the kept team                   |
| `propose_tournament_prizes` | `tournaments.manage`                                     | Replace a tournament stage's prize distribution (placement, amount, ISO 4217 currency, team, optional players) |
| `set_event_streams`         | `tournaments.manage`                                     | Replace the live streams of an event, inherited by its stages without their own list                           |
| `set_tournament_streams`    | `tournaments.manage`                                     | Replace the live streams of a tournament stage, inherited by its matches without their own list                |
| `set_match_streams`         | `tournaments.manage`                                     | Replace the live streams of one match, overriding the inherited list                                           |
| `set_match_lineups`         | `tournaments.manage`                                     | Replace the lineups of one match: the players who actually played each side, stand-ins included                |
| `set_event_viewership`      | `tournaments.manage`                                     | Replace the credited peak and average viewers of an event                                                      |
| `set_match_viewership`      | `tournaments.manage`                                     | Replace the credited peak and average viewers of one match                                                     |
| `set_circuit_stage_scale`   | `tournaments.manage`                                     | Add a PandaScore stage to a points circuit or replace its official points scale                                |
| `list_roster_proposals`     | `players.manage`, `teams.manage` or `tournaments.manage` | Not queued: lists proposals by status                                                                          |

Contract roles are `active`, `benched` and `loaned` for players, and `coach`, `assistant_coach`, `analyst` and `manager` for staff. `add_player_to_team`, `create_contract` and `update_contract` take the role; `list_contracts` returns it. A player who changes role on the same team, for example from `active` to `benched` or from player to coach, gets a new contract with `add_player_to_team` on that team, so their past contracts keep their role. Proposing the team and role the player already holds is rejected. The role shown on player and team pages comes from the current contract.

`upload_team_logo` takes `teamId`, `variant` (`light` or `dark`), the official asset's https `imageUrl` and `sourceUrl`; neither may be Liquipedia. The server downloads the asset from public addresses only (10 s, 2 MB, at most 3 redirects, none of them to Liquipedia), accepts PNG, WebP or SVG without scripts, event handlers or external references, requires 128x128 pixels for raster files, and stages a 512x512 transparent WebP in R2 under `pending/teams/{teamId}/logo-{variant}-{hash}.webp` when the proposal is created. Approval moves it to `teams/{teamId}/logo-{variant}-{hash}.webp`; rejection deletes it. The review shows the variant on light and dark backgrounds. `get_team` and `search_teams` return `logoLightUrl` and `logoDarkUrl`.

`list_roster_proposals` (`players.manage`, `teams.manage` or `tournaments.manage`) lists proposals by `status` (`pending` by default, `applied` or `rejected`) with the names they reference. Check it together with `search_players` / `search_teams` before proposing, so a pending creation is not proposed twice; an applied creation carries the new `entityId`.

A merged duplicate keeps its row and slug; its public page redirects to the kept entity and listings skip it. Merges are refused when both entities are distinct PandaScore records, when two players play for different current teams, or when two teams took part in the same tournament. If both teams still hold a prize on the same stage, the kept team's prize stays and gains the duplicate's players.

## Data sources and start.gg

Players, teams, tournaments and matches record a `source`: `pandascore`, `manual` or `startgg`. start.gg allows displaying its data with credit. start.gg players and teams are public: `search_*` and `get_*` return them with `source: "startgg"`, including as participants of PandaScore or manual matches. start.gg tournaments and matches are not redistributed: MCP reads exclude them in the query and open-data exports must filter them the same way. A roster proposal whose `sourceUrl` is on `start.gg` creates `startgg` players and teams; `create_tournament` takes `source: "startgg"` explicitly, and matches added to a start.gg tournament inherit it. The public player, team and tournament responses expose `source` so the site can credit start.gg.

Match lineups record, per match and participant, the players who actually played the series, in order. A player is a stand-in when they are not on that participant's tournament roster; the flag is computed on read, so a roster correction updates it. `set_match_lineups` takes `matchId`, one `{ participantId, playerIds }` entry per side and `sourceUrl`, replaces every lineup of the match once approved, and refuses start.gg matches, start.gg sources, unknown or merged players and a player listed twice. `get_match_lineups` answers not found for a start.gg match; the site shows start.gg lineups with a start.gg credit.

Prize distributions record, per tournament stage, a placement, a whole amount in the currency the source states, a team and optionally the players who share it. Each team must be a participant of the stage and each player must be on that team's stage roster, whether the distribution comes from the admin editor or an approved proposal. `propose_tournament_prizes` refuses start.gg tournaments. Amounts are never converted: totals are given per currency, and a prize that lists players is split equally between them on player earnings, rounded to the minor unit of its currency (no cents for JPY or KRW). The overall prize pool stays the one synced from PandaScore (`prizepool`). Prize distributions of start.gg tournaments appear on the site with a start.gg credit, but `get_tournament_prizes`, `get_team_earnings` and `get_player_earnings` do not return them: the earnings tools exclude them in the query and `get_tournament_prizes` answers not found after reading the distribution, like start.gg tournaments and matches.

Live streams are lists of `url`, `platform` (`twitch`, `youtube`, `kick` or `other`, derived from the https URL), `channel` (taken from twitch.tv, kick.com and youtube.com/@handle URLs when omitted), ISO 639-1 `language`, `kind` (`official` or `costream`) and `source`. An event, a tournament stage and a match each hold an optional list. A stage without its own list shows its event's list. A match without its own list shows the PandaScore feed of the match, else its stage's list; a match list replaces the inherited list entirely and never merges with it. An empty list clears an entity's own list. `set_event_streams`, `set_tournament_streams` and `set_match_streams` replace the whole list once approved, require `sourceUrl`, accept PandaScore entities and refuse start.gg tournaments and matches. A start.gg `sourceUrl` marks the streams `startgg`: the site shows them with a start.gg credit, and `get_event`, `get_tournament`, `get_upcoming_matches` and `get_match_results` leave them out of `streams`. A staff edit in the admin app keeps the start.gg mark of a stream whose URL it carries over, and marks every stream of a start.gg tournament or match `startgg`. `list_roster_proposals` returns an empty `streams` list for a stream proposal with a start.gg `sourceUrl`. Live streams are separate from the per-game VODs of `set_match_game_vods`.

Viewership records, for an event or a match, `peakViewers`, an optional `averageViewers` no higher than the peak, a `scope` (`official` for the official broadcasts only, `with_costreams` when co-streams are counted), an optional `measuredAt` date-time, and the `sourceName` and https `sourceUrl` credited next to the numbers on the site. `set_event_viewership` and `set_match_viewership` replace the stored numbers once approved and use the proposal `sourceUrl` as the credited link; Liquipedia, BLAST.tv and start.gg pages are refused as sources, and replay statistics are not viewership. Both accept PandaScore entities and refuse start.gg matches and events whose stages all come from start.gg. Staff may enter numbers for start.gg matches and events in the admin app: the site shows them with the source and a start.gg credit, and `get_event`, `get_tournament`, `get_upcoming_matches` and `get_match_results` never return them. `list_events` returns the viewership of the events it lists; the site event listing carries none.
A points circuit groups tournament stages under a name staff enter, such as a season or a region. Each stage carries the official points scale of its organiser: placement ranges (`from`, `to`) and the points every team in a range receives. Staff create circuits in the admin app. `set_circuit_stage_scale` proposes the whole scale of one stage with a required `sourceUrl`, the official rules or announcement and never Liquipedia, and adds the stage to the circuit once approved. Points are never estimated: a stage without a scale awards nothing. Standings add, for every stage that has ended, the points of each team's PandaScore final placement. Tied ranks share a tier and tied totals share a rank. Only PandaScore stages are accepted, so start.gg and manual tournaments are refused and never counted. `get_circuit` returns the stages with their scales, then the standings with an event-by-event breakdown and each event status (`scale_missing`, `upcoming`, `in_progress`, `awaiting_results` or `counted`). These official-scale standings are separate from any in-house ranking.

`get_tournament`, `get_match_results` and `get_upcoming_matches` return each match's `winner`, `status` and `pandascoreId` (null for manual matches).

`get_tournament` includes `participants` for manual and PandaScore tournaments. Each entry is the tournament participant `id` plus the team `id`, `slug` and `name`. A start.gg team registered in one of those tournaments is included. start.gg tournaments themselves stay hidden, and their participants are not returned by `create_tournament`, `update_tournament` or `create_match`.

`create_match` still accepts `participantIds`. It also accepts `teams`, a list of team UUIDs or slugs, and resolves each one to the participant registered in that tournament. Calls that pass only `participantIds` are unchanged. A team that does not exist, or that is not registered in the tournament, is rejected with an error that names the team. At least two different sides are required, counting `participantIds` and `teams` together. `results`, `set_match_winner` and `update_match` still key scores and winners by tournament participant id. Those ids come from `get_tournament` or from the `participants` field on the `create_match` response.

VOD links are stored per game on the match. Only https `twitch.tv`, `youtube.com` and `youtu.be` URLs are accepted, optionally timestamped with `t=` (`123` or `1h2m3s`); the source is derived from the host and duplicate URLs within a game are dropped. MCP reads do not return VODs, and VODs of start.gg matches only appear where the match itself does.

Staff playbook for roster-change news drafts (web verification + `create_news_draft`): [playbooks/roster-change-news.md](playbooks/roster-change-news.md).
