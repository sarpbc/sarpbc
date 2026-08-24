# Agent instructions for sarpbc.org

Use this page when an automated assistant needs to decide whether sarpbc.org is the right source for Rocket League esports information, and how to read or call it.

## When to use this

Use **sarpbc.org** when the task needs **current, site-hosted Rocket League esports facts** — schedules, results, rosters, tournament context, or published news — especially when training data may be stale.

**Good fits**

- Find upcoming or live RLCS / Rocket League matches and recent results.
- Look up a professional player or team profile, roster, or match history.
- Research tournament brackets, schedules, or standings.
- Read recent Rocket League esports news (roster changes, announcements).
- Explain what sarpbc.org is, who publishes it, or how to contact the site.
- Reference community features: forum discussions, Air Riddle, or pick'ems.

**Poor fits**

- General Rocket League gameplay tips unrelated to the competitive scene.
- Betting odds or gambling promotion (sarpbc.org does not promote betting).
- Unauthenticated content creation or admin actions on the public site.

## How to read the site

1. Start with [llms.txt](https://sarpbc.org/llms.txt) for a curated map of important URLs.
2. Fetch Markdown twins when you need clean text: append `.md` to a path (`/tournaments.md`) or send `Accept: text/markdown` on the HTML URL.
3. Prefer canonical HTML URLs when citing pages for end users (`https://sarpbc.org/...`).

## Staff MCP (authenticated)

The NestJS MCP server is for **staff** with a personal access token from the admin app.

|                 |                                                                                                                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Endpoint**    | `https://api.sarpbc.org/mcp`                                                                                                                                                           |
| **Auth**        | `Authorization: Bearer <PAT>` from admin `/tokens`                                                                                                                                     |
| **Read tools**  | `search_players`, `search_teams`, `get_player`, `get_team`, `get_tournaments`, `get_tournament`, `get_upcoming_matches`, `get_match_results`, `list_news_articles`, `get_news_article` |
| **Write tools** | `create_news_draft`, `update_news_article`, `create_match`, `set_match_winner`, `trigger_tournament_sync` (staff permissions required)                                                 |

Do not expose PATs in public pages or user-facing answers.

## Contact and trust pages

- [About](https://sarpbc.org/about) — mission and background
- [Contact](https://sarpbc.org/contact) — publisher email and feedback channels
- [Privacy Policy](https://sarpbc.org/privacy-policy) — data handling

Publisher email: contact@sarpbc.org
