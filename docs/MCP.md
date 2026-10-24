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

| Tool                      | Permission           | Description                                      |
| ------------------------- | -------------------- | ------------------------------------------------ |
| `create_match`            | `tournaments.manage` | Create a tournament match                        |
| `set_match_winner`        | `tournaments.manage` | Set match winner by participant id               |
| `update_match`            | `tournaments.manage` | Correct score, status or dates of a manual match |
| `trigger_tournament_sync` | `tournaments.manage` | Sync one tournament or PandaScore additions      |

Roster tools (staff permission and a public `sourceUrl` required). Nothing is physically deleted: roster moves close the open contract and record the join and departure sources, and teams are marked inactive instead of removed.

| Tool                      | Permission       | Description                                                                                                |
| ------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------- |
| `add_player_to_team`      | `players.manage` | Close the player's open contracts and open one with the new team                                           |
| `remove_player_from_team` | `players.manage` | Close the contract and set the player `free_agent` or `retired`                                            |
| `create_player`           | `players.manage` | Create a player without a team (name, country, status, role)                                               |
| `update_player`           | `players.manage` | Update name, country, status (`active`, `free_agent`, `retired`) or role (`player`, `coach`, `substitute`) |
| `create_team`             | `teams.manage`   | Create a team (name, country, logo)                                                                        |
| `update_team`             | `teams.manage`   | Update name, country or logo, or mark an empty team inactive                                               |

`get_tournament`, `get_match_results` and `get_upcoming_matches` return each match's `winner`, `status` and `pandascoreId` (null for manual matches).

Staff playbook for roster-change news drafts (web verification + `create_news_draft`): [playbooks/roster-change-news.md](playbooks/roster-change-news.md).
