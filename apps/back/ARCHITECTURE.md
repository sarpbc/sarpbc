# Backend architecture

Each feature separates business decisions from HTTP, NestJS, and storage.

```text
src/<feature>/
  domain/          Detached models, invariants, and policies
  application/     Use cases, inputs, projections, and consumed ports
  infrastructure/  Nest factories, HTTP, ORM, external services, and jobs
```

`app.module.ts`, `main.ts`, `configure-app.ts`, and the ORM configuration assemble the application. Shared technical services live in `src/infrastructure`. Shared pure contracts live in `src/common/domain` and `src/common/application`.

## Dependencies

Domain code depends on pure domain code. Application code depends on domain models and pure application contracts. Infrastructure implements those contracts and supplies dependencies through Nest provider factories. Application classes have no Nest decorators.

ORM records and domain models are separate representations. Persistence mappers return detached objects and arrays. Controllers present explicit response objects rather than serialize managed ORM records. Decorated request DTOs stay at HTTP boundaries. PandaScore adapters validate provider responses with Zod before mapping them into application commands.

Feature consumers use application services or consumed ports. Shared relational mappings are exposed through the explicit roster and competition infrastructure composition files. Private repositories remain private. Source imports use relative paths so the compiled application runs directly in Node.js.

## Writes and execution contexts

Application operations choose atomic boundaries through feature-specific transaction ports. Their infrastructure adapters bind every participating store to the same transactional EntityManager. Staged stores do not independently commit. The transaction resolves after flush and commit.

The following operations share a transaction:

- A reply and its direct-reply notification.
- A forum post and its translations.
- Content deletion and dependent replies, notifications, reports, or translations.
- Player photo replacement or selection, and player or team deletion with dependent roster data.
- A roster move: closing the player's open contracts, opening the new one and updating the current team and status.
- A player or team merge: moving contracts, photos, awards and tournament participations to the kept entity and recording the duplicate's redirect.
- A roster proposal approval and the change it applies; a failed change leaves the proposal pending.
- A manual tournament change, a competition import, or a pick and its eligibility checks.

HTTP requests use the MikroORM request context. Scheduled jobs and initialization hooks establish their own contexts in infrastructure. Adapters retain no request-specific managed state on application singletons.

## Ownership and failures

Players, teams, tournaments and matches record their `source` (`pandascore`, `manual` or `startgg`). start.gg terms allow display with credit but not redistribution, so MCP reads and any open-data export filter `startgg` rows through `isRedistributable`. A merged player or team keeps its row and slug with `mergedInto`; reads by id or slug resolve to the kept entity and listings skip it.

Current-team imports and historical tournament rosters are separate operations. A historical roster refresh cannot move an existing participant's players back to an old team. PandaScore numeric IDs identify imported players; imports preserve local slugs and tournament artwork. Domain policies reject PandaScore writes to manual tournaments.

Application failures carry semantic kinds and optional business codes. The HTTP exception filter maps them to existing statuses and payloads. Authentication cookies, JWT signing, Google OAuth clients, PAT hashing, and SDK configuration remain infrastructure concerns. PAT resolution rechecks the owner's current staff role.

A tournament row is a stage of a tournament event. PandaScore serie IDs identify events, a manual tournament is the single stage of its own event, and event and stage slugs are frozen once allocated. A serie merge re-keys the event, or moves its stages into the target event and retires the old slug.

Tournament detail caching stores response DTOs for 60 seconds under `tournament:<id>`. Event pages read their stages through the same cache, so an event or serie rename invalidates every stage of that event. The infrastructure reader validates cached JSON and falls back to PostgreSQL on an invalid value or Redis failure. Writes invalidate after commit. A failed optional invalidation preserves database success and emits a diagnostic. Invalidation does not guarantee immediate freshness against a concurrent cache fill. Permissions and transaction decisions use authoritative database reads.

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
pnpm --filter back test
pnpm --filter back test:e2e
pnpm --filter back test:integration
pnpm --filter back test:cov
```

The architecture check resolves imports, including type imports, aliases, and reexports. Its tests deliberately introduce forbidden dependencies. The HTTP fixture records routes, status overrides, guards, and permissions; behavior tests verify response content separately.

Integration verification runs the real application sources under Vitest and uses disposable PostgreSQL and Redis containers. It rebuilds the database with the compiled MikroORM migrations, checks that no migration or schema change remains pending, and exercises real adapters and transaction rollback. A second migration run must apply nothing. The coverage command combines these workflows with unit and HTTP smoke tests. Unit tests and mocked HTTP smoke tests alone do not establish SQL atomicity or Redis semantics.
