# SAR-111 — Player MVP awards data source

**Date:** 2026-08-06  
**Issue:** [SAR-111](https://linear.app/sarpbc/issue/SAR-111/spike-player-mvp-awards-data-source-profile-section)  
**Parent:** [SAR-104](https://linear.app/sarpbc/issue/SAR-104/epic-player-and-team-profile-pages-hltv-style)

## Question

Does PandaScore expose per-event MVP / awards for Rocket League that we can sync into player profiles? If not, what is the smallest viable data path?

## Method

- Desk research against PandaScore docs and endpoint index (`developers.pandascore.co`)
- Repo audit: entities, sync DTOs, admin overrides, trophies path
- Live probe (token from local `apps/back/.env`, never committed):
  - `GET /rl/matches/past?per_page=1&filter[detailed_stats]=true` → match `1499218`
  - `GET /rl/matches/1499218/players/stats` → **404**
  - `GET /rl/players/1/stats` → **404**
  - Control: `GET /csgo/matches/1/players/stats` → **403** (endpoint exists, plan-gated)

## Findings

### A — No MVP/award concept in PandaScore

Endpoint index search for `mvp` / `award` returns no matches across titles. Awards are not a PandaScore data model concept.

### B — Rocket League has no player-stats endpoints

Titles with `players/stats` (or match player stats): CS2 (`/csgo/`), Dota 2, LoL, Overwatch, Valorant. Those are plan-gated (403 without historical/live plan).

Rocket League: no equivalent endpoints (404). This is not a billing gap we can buy out of.

### C — RL match payloads have no player rows

Live sample match keys include `games`, `opponents`, `winner`, etc. Game objects expose schedule/status/winner fields only (`begin_at`, `complete`, `detailed_stats`, `end_at`, `finished`, `forfeit`, `id`, `length`, `match_id`, `position`, `status`, `winner`, `winner_type`). No per-player stats to derive an MVP heuristically.

### D — Codebase

| Question                  | Answer                                                           |
| ------------------------- | ---------------------------------------------------------------- |
| MVP/award entity?         | None                                                             |
| Trophies = awards?        | No. Trophies are computed tournament _wins_ via `winner.players` |
| Award fields on entities? | None                                                             |
| PandaScore DTOs?          | Winner id/type only                                              |
| Ballchasing?              | Not integrated; not an official-award source                     |
| Manual admin precedent?   | Yes — `setMatchWinner` on admin tournament detail                |

## Decision

**Auto-sync is ruled out.** Manual admin curation is the only viable path.

Volume is roughly 3–6 official MVPs per year (Majors + Worlds), so curation cost is low. Horizon stays **Later** (depth feature; below match discovery / match detail for north-star impact).

**This spike ships documentation only.** No `PlayerAward` entity, migration, or public UI — an empty table with no writer/reader violates AGENTS.md simplicity rules.

## Follow-up sketch (not in this PR)

Ready for a Backlog implementation ticket:

1. `PlayerAward` entity in tournament module (`tournament` + `participant` + `player` + `type` enum, unique on tournament/player/type)
2. `GET /player/:id/awards`
3. Admin `POST`/`DELETE` on tournament under `tournaments.manage`, UI next to `setMatchWinner`
4. Separate ticket for `/player/[slug]` awards section after data exists

**Open product question:** who backfills historical RLCS MVPs, and how far back? If nobody, do not ship an empty public section.

## Non-goals

- Public player profile MVP UI
- Extending the trophies path
- New PandaScore client methods for non-existent endpoints
- Speculative schema without admin writer

## References

- [PandaScore getting started](https://developers.pandascore.co/docs/getting-started)
- [RL players list](https://developers.pandascore.co/reference/get_rl_players)
- Admin override pattern: `apps/admin/app/pages/tournaments/[id].vue` (`setMatchWinner`)
- Wins (not awards): `TournamentService.getTournamentsWonByPlayer`
