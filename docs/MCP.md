# MCP server

Staff AI assistants can call the SARPBC API through a [Model Context Protocol](https://modelcontextprotocol.io) server mounted on the NestJS backend.

|               |                                                                                                          |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| **Endpoint**  | `https://api.sarpbc.org/mcp` (local: `http://localhost:4001/mcp`)                                        |
| **Transport** | Stateless Streamable HTTP (`POST` only)                                                                  |
| **Auth**      | Personal access token from the admin app → **Tokens** (`/tokens`). Send `Authorization: Bearer <token>`. |

## Client configuration

**Claude Desktop** (`claude_desktop_config.json`):

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

**Cursor** (`.cursor/mcp.json`):

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

Read tools (any valid PAT):

| Tool                   | Description                              |
| ---------------------- | ---------------------------------------- |
| `search_players`       | Search players by name                   |
| `search_teams`         | Search teams by name                     |
| `get_player`           | Player profile by slug or id             |
| `get_team`             | Team profile and roster by slug or id    |
| `get_tournaments`      | List tournaments (`activeOnly`, `limit`) |
| `get_tournament`       | Tournament detail with matches           |
| `get_upcoming_matches` | Upcoming and live matches                |
| `get_match_results`    | Recent finished match results            |

News tools (`news.manage`):

| Tool                  | Description                                                                         |
| --------------------- | ----------------------------------------------------------------------------------- |
| `list_news_articles`  | List articles including drafts                                                      |
| `get_news_article`    | Full EN/FR article by slug or id                                                    |
| `create_news_draft`   | EN/FR news draft using `:player` / `:team` / `:tweet` MDC tags (human must publish) |
| `update_news_article` | Patch an existing article (does not publish)                                        |

Write tools (staff permission required):

| Tool                         | Permission           | Description                                                                              |
| ---------------------------- | -------------------- | ---------------------------------------------------------------------------------------- |
| `create_match`               | `tournaments.manage` | Create a tournament match                                                                |
| `set_match_winner`           | `tournaments.manage` | Set match winner by participant id                                                       |
| `update_match`               | `tournaments.manage` | Correct score, status or dates of a manual match                                         |
| `set_match_game_vods`        | `tournaments.manage` | Replace the Twitch/YouTube VOD links of one game, with their ISO 639-1 language          |
| `trigger_tournament_sync`    | `tournaments.manage` | Sync one tournament or PandaScore additions                                              |
| `update_tournament`          | `tournaments.manage` | Edit a manual tournament; on a synced one, only the image and an end date the sync keeps |
| `link_pandascore_tournament` | `tournaments.manage` | Turn a manual tournament into its PandaScore stage instead of importing a duplicate      |

Roster tools (staff permission and a public `sourceUrl` required). They only queue a proposal: nothing changes until a staff member with the same permission approves it in admin → **Roster proposals** (`/proposals`). A failed approval leaves the proposal pending. Nothing is physically deleted: roster moves close the open contract and record the join and departure sources, teams are marked inactive instead of removed, and merged duplicates stay as redirects.

| Tool                      | Permission       | Description once approved                                                                    |
| ------------------------- | ---------------- | -------------------------------------------------------------------------------------------- |
| `add_player_to_team`      | `players.manage` | Close the player's open contracts and open one with the new team and contract role           |
| `remove_player_from_team` | `players.manage` | Close the contract and set the player `free_agent` or `retired`                              |
| `create_player`           | `players.manage` | Create a player without a team (name, country, status)                                       |
| `update_player`           | `players.manage` | Update name, country or status (`active`, `free_agent`, `retired`)                           |
| `create_team`             | `teams.manage`   | Create a team (name, country, logo)                                                          |
| `update_team`             | `teams.manage`   | Update name, country or logo, or mark an empty team inactive                                 |
| `merge_players`           | `players.manage` | Move a duplicate's contracts, photos, awards and tournament rosters to the kept player       |
| `merge_teams`             | `teams.manage`   | Move a duplicate's contracts, current players and tournament participations to the kept team |

Contract roles are `active`, `benched` and `loaned` for players, and `coach`, `assistant_coach`, `analyst` and `manager` for staff. `add_player_to_team`, `create_contract` and `update_contract` take the role; `list_contracts` returns it. A player who changes role on the same team, for example from `active` to `benched` or from player to coach, gets a new contract with `add_player_to_team` on that team, so their past contracts keep their role. Proposing the team and role the player already holds is rejected. The role shown on player and team pages comes from the current contract.

`list_roster_proposals` (`players.manage`) lists proposals by `status` (`pending` by default, `applied` or `rejected`) with the names they reference. Check it together with `search_players` / `search_teams` before proposing, so a pending creation is not proposed twice; an applied creation carries the new `entityId`.

A merged duplicate keeps its row and slug; its public page redirects to the kept entity and listings skip it. Merges are refused when both entities are distinct PandaScore records, when two players play for different current teams, or when two teams took part in the same tournament.

## Data sources and start.gg

Players, teams, tournaments and matches record a `source`: `pandascore`, `manual` or `startgg`. start.gg allows displaying its data with credit. start.gg players and teams are public: `search_*` and `get_*` return them with `source: "startgg"`, including as participants of PandaScore or manual matches. start.gg tournaments and matches are not redistributed: MCP reads exclude them in the query and open-data exports must filter them the same way. A roster proposal whose `sourceUrl` is on `start.gg` creates `startgg` players and teams; `create_tournament` takes `source: "startgg"` explicitly, and matches added to a start.gg tournament inherit it. The public player, team and tournament responses expose `source` so the site can credit start.gg.

`get_tournament`, `get_match_results` and `get_upcoming_matches` return each match's `winner`, `status` and `pandascoreId` (null for manual matches).

VOD links are stored per game on the match. Only https `twitch.tv`, `youtube.com` and `youtu.be` URLs are accepted, optionally timestamped with `t=` (`123` or `1h2m3s`); the source is derived from the host and duplicate URLs within a game are dropped. MCP reads do not return VODs, and VODs of start.gg matches only appear where the match itself does.

Staff playbook for roster-change news drafts (web verification + `create_news_draft`): [playbooks/roster-change-news.md](playbooks/roster-change-news.md).
