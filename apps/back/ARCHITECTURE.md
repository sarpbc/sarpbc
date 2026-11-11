# Backend architecture

Each feature separates business decisions from HTTP, NestJS, and storage.

```text
src/<feature>/
  domain/          Detached models, invariants, and policies
  application/     Use cases, records, inputs, projections, and consumed ports
  infrastructure/  Nest factories, HTTP, ORM, external services, and jobs
```

Records, inputs, and projections live in `application/`; the domain holds models and rules. `roster/` owns players, teams, contracts, and photos. Competition lives in `tournament/`.

`app.module.ts`, `main.ts`, `configure-app.ts`, and the ORM configuration assemble the application. Shared technical services live in `src/infrastructure`. Shared pure contracts live in `src/common/domain` and `src/common/application`.

## Dependencies

Domain code depends on pure domain code. Application code depends on domain models and pure application contracts. Infrastructure implements those contracts and supplies dependencies through Nest provider factories. Application classes have no Nest decorators.

The graph of features formed by `domain/` and `application/` imports is acyclic, and `test:architecture` reports each cycle with one importing file per edge. Infrastructure is excluded: Nest composition and shared relational mappings legitimately cross features in both directions.

ORM records and domain models are separate representations. Persistence mappers return detached objects and arrays. Controllers present explicit response objects rather than serialize managed ORM records. Decorated request DTOs stay at HTTP boundaries.

The consumer owns each contract it needs from an external provider. `pandascore/` is an infrastructure-only adapter. `PandascoreCompetitionFeed` implements competition's `CompetitionFeed`, and `PandascoreCurrentRosterSource` implements roster's `CurrentRosterSource`. Competition also owns `SyncCursor`, which its own infrastructure implements. The adapters validate provider responses with Zod before mapping them into the consumer's commands.

Feature consumers use application services or consumed ports. Shared relational mappings are exposed only through each feature's persistence facade: `roster/infrastructure/roster-persistence.ts`, `tournament/infrastructure/competition-persistence.ts`, `user/infrastructure/user-persistence.ts`, `forum/infrastructure/forum-persistence.ts`, `news/infrastructure/news-persistence.ts` and `reply/infrastructure/reply-persistence.ts`. Importing another feature's `infrastructure/persistence/**` directly fails `test:architecture`; modules and `composition.ts` files may compose another feature's providers, and `common/` is shared. Private repositories remain private. Source imports use relative paths so the compiled application runs directly in Node.js.

## Writes and execution contexts

Application operations choose atomic boundaries through feature-specific transaction ports. Their infrastructure adapters bind every participating store to the same transactional EntityManager. Staged stores do not independently commit; a store may flush inside the transaction only to turn a unique or foreign-key violation into a typed application error through `isUniqueViolation` or `isForeignKeyViolation` in `common/infrastructure/persistence`. `reply/` owns the `Reply` and `ReplyReport` entities and the one reply creation path; forum and news only delete their replies through `replyDeletion`. The transaction resolves after flush and commit.

The following operations share a transaction:

- A reply and its direct-reply notification.
- A forum post and its translations.
- Content deletion and dependent replies, notifications, reports, or translations.
- Player photo replacement or selection, and player deletion with dependent roster data.
- A team, match or empty manual event deletion and the reference checks that refuse it: a PandaScore entity, or a team with players, contracts, merged duplicates, participations, matches or prizes, or a match with picks, comments or bracket matches fed by it. A match deletion removes its scores, incoming bracket links, lineups and game stats; standings and records are derived on read. Approving an MCP delete proposal runs the same staff path.
- A roster move: closing the player's open contracts, opening the new one and updating the current team and status.
- A game's stats, the platform links its unique roster-name matches teach, the linking of earlier rows of those accounts and the clearing of any staff exclusion of its replay; a staff platform link and the repointing of every stat row of that account; a staff game removal and the exclusion of its replay.
- A player or team merge: moving contracts, photos, awards, match lineups (dropping the duplicate's row in a match the kept player already played), game stats, platform links, prize distributions and tournament participations to the kept entity and recording the duplicate's redirect. Roster owns the `RosterReferenceMover` port; each feature implements it for its own tables inside the merge transaction (`TournamentRosterReferences` for competition, `MatchStatsRosterReferences` for game stats and platform links), so a table that references a player or team carries its merge rule with it.
- A contract write: every path (staff REST, roster proposals) checks the player's career (overlaps, the open contract belongs to the current team) before saving; an overlapping period is a 422.
- A roster proposal approval and the change it applies; a failed change leaves the proposal pending. Roster services open their own `RosterTransaction` inside the approval; they join the proposal's transaction because MikroORM resolves every `EntityManager.transactional` call in one request to the same ambient context.
- A manual tournament change, a competition import, or a pick and its eligibility checks.

Application services publish domain events through feature ports after commit, so a feature reacts to another without importing it. `MatchDecided` is republished on each committed write that leaves a match decided, which lets a re-sync retry a failed handler. Handlers are idempotent and best effort. Pick'em scores picks from this event, and its manual validation endpoint is the recovery path. Competition applies cache invalidation and event publication after every committed write through one operation, `CompetitionAfterCommit.settle`, which is fail-soft. Pick'em never writes competition rows: when it derives a winner it calls `MatchService.setMatchWinner`, so `endAt`, `MatchDecided` and the cache are handled like any other decision, and it reads matches through the same service.

HTTP requests use the MikroORM request context. Scheduled jobs and initialization hooks establish their own contexts in infrastructure. Adapters retain no request-specific managed state on application singletons.

The repository has no job queue. A staff stats import (`match-stats`) is stored as a `pending` row, then `StatsImportService` schedules its run through the `StatsImportScheduler` port, so HTTP and MCP requests start it the same way. It runs in the API process after the request returns, in its own context. Its status and report live in PostgreSQL. At boot, any import left unfinished by a restart is marked failed. `match-stats` reads competition data (matches, tournaments, rosters) only through its own `StatsCandidates` and `PlayerLinkStore` ports, and the match detail controller reads per-game stats through the exported `GAME_STATS_STORE` provider.

## Ownership and failures

<<<<<<< HEAD
Players, teams, tournaments and matches record their `source` (`pandascore`, `manual` or `startgg`). start.gg terms allow display with credit. start.gg players and teams are public everywhere, MCP included; start.gg tournaments and matches are not redistributed, so MCP reads and any open-data export filter them through `isRedistributable` or the `redistributableOnly` list option. Prize distributions and earnings follow their tournament: site responses keep start.gg rows with their `source` for the credit, and MCP earnings reads pass `redistributableOnly`. Match lineups follow their match: the public match detail and `/player/:id/stand-ins` keep start.gg lineups for the credit, and MCP reads and lineup proposals refuse them. A lineup player is a stand-in when they are not on the participant's tournament roster, computed on read. Live streams carry a `source` per stream, set from the proposal's `sourceUrl` and kept for a URL a staff edit carries over; site responses keep start.gg streams for the credit and MCP reads drop them. An event, a stage and a match each store their own stream list, and reads resolve the first non-empty one: match, PandaScore match feed, stage, event. An event and a match each store an optional viewership (peak and average viewers with a mandatory credited source); the match and event pages return it, event listings do not, and MCP reads return it only for redistributable owners. A start.gg team does not hide the redistributable match it plays in. A merged player or team keeps its row and slug with `mergedInto`; reads by id or slug resolve to the kept entity and listings skip it.
=======
Players, teams, tournaments and matches record their `source` (`pandascore`, `manual` or `startgg`). start.gg terms allow display with credit. start.gg players and teams are public everywhere, MCP included; start.gg tournaments and matches are not redistributed, so MCP reads and any open-data export filter them through `isRedistributable` or the `redistributableOnly` list option. Prize distributions and earnings follow their tournament: site responses keep start.gg rows with their `source` for the credit, and MCP earnings reads pass `redistributableOnly`. Live streams carry a `source` per stream, set from the proposal's `sourceUrl` and kept for a URL a staff edit carries over; site responses keep start.gg streams for the credit and MCP reads drop them. An event, a stage and a match each store their own stream list, and reads resolve the first non-empty one: match, PandaScore match feed, stage, event. An event and a match each store an optional viewership (peak and average viewers with a mandatory credited source); the match and event pages return it, the site event listing does not, and MCP reads return it only for redistributable owners. A start.gg team does not hide the redistributable match it plays in. A merged player or team keeps its row and slug with `mergedInto`; reads by id or slug resolve to the kept entity and listings skip it.
>>>>>>> 677d1d8e (fix: keep viewership editor inputs as text and refuse start.gg sources)

Transfers are not stored. `GET /transfers` derives them from contracts up to the current day: a contract start is an arrival, a benching, a loan or a staff move according to its role, and a contract end is a departure unless a contract with the same team starts that day. The `from` and `to` bounds apply to the derived movements only; the contract query filters by team and player.

Current-team imports and historical tournament rosters are separate operations. A historical roster refresh cannot move an existing participant's players back to an old team. PandaScore numeric IDs identify imported players; imports preserve local slugs and tournament artwork. Domain policies reject PandaScore writes to manual tournaments.

Application failures carry semantic kinds and optional business codes. The HTTP exception filter maps them to existing statuses and payloads. Authentication cookies, JWT signing, Google OAuth clients, PAT hashing, and SDK configuration remain infrastructure concerns. PAT resolution rechecks the owner's current staff role.

A tournament row is a stage of a tournament event. PandaScore serie IDs identify events, a manual tournament is the single stage of its own event, and event and stage slugs are frozen once allocated. A serie merge re-keys the event, or moves its stages into the target event and retires the old slug.

Tournament detail caching stores response DTOs for 60 seconds under `tournament:<id>`. Event pages read their stages through the same cache, so an event or serie rename invalidates every stage of that event. The infrastructure reader validates cached JSON and falls back to PostgreSQL on an invalid value or Redis failure. Writes invalidate after commit through `CompetitionAfterCommit`. A failed optional invalidation preserves database success and emits a diagnostic. Invalidation does not guarantee immediate freshness against a concurrent cache fill. Permissions and transaction decisions use authoritative database reads.

## Design choice

Write models protect the invariant being changed; read projections avoid loading entire aggregates for directory endpoints. This keeps business decisions out of persistence adapters without introducing a command bus, generic repository hierarchy, or compatibility APIs. The ORM manifest remains the single registry used by runtime and CLI discovery.

## Verification

Run these commands from the repository root:

```sh
pnpm --filter back typecheck
pnpm --filter back typecheck:tests
pnpm --filter back lint
pnpm --filter back fmt:check
pnpm --filter back test:architecture
pnpm --filter back test:contracts
pnpm --filter back test:migrations
pnpm --filter back test
pnpm --filter back test:e2e
pnpm --filter back test:integration
pnpm --filter back test:cov
```

The architecture check resolves imports, including type imports, aliases, and reexports, and detects feature cycles in the inner layers. In `domain/` and `application/`, a package import passes only if it is on the allowlist in `scripts/check-architecture.mjs` (`@sarpbc/types`, `@sarpbc/utils`, `uuid`, `node:crypto`); add a package there only when it is pure. Files under `common/` may import only `common/`, the root `infrastructure/` (configuration) and packages, never a feature folder. Its tests deliberately introduce forbidden dependencies in temporary directories. The HTTP fixture records routes, status overrides, guards, and permissions; behavior tests verify response content separately. After an intended route, guard, or permission change, refresh the fixture with `pnpm --filter back test:contracts --write` followed by `pnpm --filter back fmt`, and review the diff of `test/contracts/http-routes.json`.

Integration verification runs the real application sources under Vitest and uses disposable PostgreSQL and Redis containers. It rebuilds the database with the compiled MikroORM migrations, checks that no migration or schema change remains pending, and exercises real adapters and transaction rollback. A second migration run must apply nothing. The coverage command combines these workflows with unit and HTTP smoke tests. Unit tests and mocked HTTP smoke tests alone do not establish SQL atomicity or Redis semantics.
