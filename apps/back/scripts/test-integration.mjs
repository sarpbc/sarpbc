import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(resolve(root, "package.json"));
const containers = [];
const results = [];
let app;
let redis;

function docker(...args) {
  return execFileSync("docker", args, { encoding: "utf8", timeout: 30_000 }).trim();
}

async function container(service, image, port, environment, readiness) {
  const name = `sarpbc-integration-${service}-${randomUUID()}`;
  docker(
    "run",
    "--detach",
    "--rm",
    "--name",
    name,
    "--publish",
    `127.0.0.1::${port}`,
    ...Object.entries(environment).flatMap(([key, value]) => ["--env", `${key}=${value}`]),
    image,
  );
  containers.push(name);
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      docker("exec", name, ...readiness);
      const binding = JSON.parse(
        docker("inspect", "--format", "{{json .NetworkSettings.Ports}}", name),
      );
      return Number(binding[`${port}/tcp`][0].HostPort);
    } catch {
      await delay(500);
    }
  }
  throw new Error(`${service} did not become ready within 30 seconds`);
}

async function check(name, work) {
  await work();
  results.push(name);
  process.stdout.write(`PASS ${name}\n`);
}

async function request(method, url, payload, cookie, status = 200, headers = {}) {
  const requestHeaders = { ...headers };
  if (cookie) requestHeaders.cookie = cookie;
  const response = await app.inject({
    method,
    url,
    payload,
    remoteAddress: "127.0.0.1",
    headers: requestHeaders,
  });
  assert.equal(response.statusCode, status, `${method} ${url}: ${response.body}`);
  return response;
}

function cookies(response) {
  const values = response.headers["set-cookie"];
  assert(Array.isArray(values) && values.length >= 2, "access and refresh cookies are returned");
  assert(
    values.every((value) => /HttpOnly/i.test(value)),
    "authentication cookies are HttpOnly",
  );
  return values.map((value) => value.split(";")[0]).join("; ");
}

try {
  const pgPort = await container(
    "postgres",
    "postgres:18.0-alpine",
    5432,
    {
      POSTGRES_USER: "integration",
      POSTGRES_PASSWORD: "integration-only",
      POSTGRES_DB: "integration",
    },
    ["pg_isready", "-U", "integration", "-d", "integration"],
  );
  const redisPort = await container("redis", "redis:7.4-alpine", 6379, {}, ["redis-cli", "ping"]);
  Object.assign(process.env, {
    NODE_ENV: "test",
    PORT: "4001",
    DB_HOST: "127.0.0.1",
    DB_PORT: String(pgPort),
    DB_NAME: "integration",
    DB_USER: "integration",
    DB_PASSWORD: "integration-only",
    REDIS_HOST: "127.0.0.1",
    REDIS_PORT: String(redisPort),
    REDIS_PASSWORD: "",
    JWT_KEY: "integration-only-key-never-for-production",
    PANDASCORE_API_TOKEN: "integration-not-a-real-token",
    PANDASCORE_SYNC_ON_BOOT: "false",
    GOOGLE_CLIENT_ID: "integration",
    GOOGLE_CLIENT_SECRET: "",
    GOOGLE_REDIRECT_URI: "http://127.0.0.1/auth/google/callback",
    FRONT_URL: "http://127.0.0.1:4000",
    ADMIN_URL: "http://127.0.0.1:4002",
    CLOUDFLARE_ACCOUNT_ID: "",
    CLOUDFLARE_API_TOKEN: "",
    CLOUDFLARE_ACCOUNT_HASH: "",
    R2_ACCESS_KEY_ID: "",
    R2_SECRET_ACCESS_KEY: "",
    R2_PUBLIC_BASE_URL: "",
    R2_ENDPOINT: "",
    R2_ACCOUNT_ID: "",
    R2_BUCKET: "integration",
    POSTHOG_PROJECT_TOKEN: "",
    POSTHOG_HOST: "http://127.0.0.1:1",
  });
  require("reflect-metadata");
  const { initLogger } = require("evlog");
  initLogger({ env: { service: "backend-integration", environment: "test" } });
  const { NestFactory } = require("@nestjs/core");
  const { FastifyAdapter } = require("@nestjs/platform-fastify");
  const { MikroORM } = require("@mikro-orm/postgresql");
  const { SchedulerRegistry } = require("@nestjs/schedule");
  const { RequestContext, TransactionContext } = require("@mikro-orm/core");
  const { AppModule } = require("./dist/app.module.js");
  const { configureApp } = require("./dist/configure-app.js");
  app = await NestFactory.create(AppModule, new FastifyAdapter(), {
    logger: false,
    abortOnError: false,
  });
  await configureApp(app);
  const orm = app.get(MikroORM);
  const Redis = require("ioredis");
  redis = new Redis({ host: "127.0.0.1", port: redisPort });
  const rows = (path) => require(`./dist/${path}.js`);
  const { User } = rows("user/infrastructure/persistence/user.entity");
  const rosterRows = rows("player/infrastructure/persistence/player.entities");
  const { Reply, ReplyReport } = rows("forum/infrastructure/persistence/forum.entities");
  const { ReplyNotification } = rows(
    "notification/infrastructure/persistence/reply-notification.entity",
  );
  const { PersonalAccessToken } = rows(
    "pat/infrastructure/persistence/personal-access-token.entity",
  );
  const { PickemChoice } = rows("game/pickem/infrastructure/persistence/pickem.entity");
  const { PatService } = rows("pat/application/pat.service");

  await check("MikroORM migrations rebuild PostgreSQL with no pending schema changes", async () => {
    orm.config.get("migrations").snapshot = false;
    const migrator = orm.migrator;
    const pending = await migrator.getPending();
    assert(pending.length > 0, "the fresh database has migrations to apply");
    const applied = await migrator.up();
    assert.equal(applied.length, pending.length);
    assert.deepEqual(await migrator.getPending(), []);
    assert.equal(await migrator.checkSchema(), false);
    assert.equal((await orm.schema.getUpdateSchemaSQL()).trim(), "");
    assert.deepEqual(await migrator.up(), []);
  });
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  for (const job of app.get(SchedulerRegistry).getCronJobs().values()) job.stop();

  let staffCookie, memberCookie, staff, member;
  await check(
    "HTTP signup, login, refresh, safe profile mapping and staff authorization",
    async () => {
      const signup = async (email, userName) =>
        cookies(
          await request("POST", "/auth/signup", {
            email,
            userName,
            password: "integration-password",
          }),
        );
      staffCookie = await signup("staff@example.test", "Integration Staff");
      memberCookie = await signup("member@example.test", "Integration Member");
      staff = (await request("GET", "/user/profile", undefined, staffCookie)).json().user;
      member = (await request("GET", "/user/profile", undefined, memberCookie)).json().user;
      assert(!("password" in staff) && !("googleId" in staff));
      await request("GET", "/user/profile", undefined, undefined, 401);
      await request("POST", "/team", { name: "Forbidden" }, memberCookie, 403);
      await orm.em.fork().nativeUpdate(User, { id: staff.id }, { role: "admin" });
      staffCookie = cookies(
        await request("POST", "/auth/login", {
          email: "staff@example.test",
          password: "integration-password",
        }),
      );
      cookies(await request("POST", "/auth/refresh", undefined, staffCookie));
      await request(
        "POST",
        "/auth/login",
        { email: "staff@example.test", password: "incorrect" },
        undefined,
        401,
      );
      await request("POST", "/team", { name: "Invalid", unexpected: true }, staffCookie, 400);
      const patched = (
        await request("PATCH", "/user/profile", { userName: "Integration Renamed" }, memberCookie)
      ).json();
      assert.equal(patched.user.userName, "Integration Renamed");
    },
  );

  let article;
  await check("news draft privacy, publication, French content and sitemap", async () => {
    article = (
      await request(
        "POST",
        "/news",
        {
          title: "Integration News",
          content: "<p>Published report</p>",
          titleFr: "Actualité intégration",
          contentFr: "<p>Rapport français</p>",
        },
        staffCookie,
        201,
      )
    ).json();
    await request("GET", `/news/${article.slug}`, undefined, undefined, 404);
    assert.equal(
      (await request("GET", `/news/admin/${article.slug}`, undefined, staffCookie)).json().isDraft,
      true,
    );
    await request("PATCH", `/news/${article.slug}/publish`, {}, staffCookie, 204);
    assert.equal(
      (await request("GET", `/news/${article.slug}?locale=fr-FR`)).json().title,
      "Actualité intégration",
    );
    assert.equal((await request("GET", "/news/sitemap")).json().total, 1);
    await request("GET", "/news?locale=en-US&page=0&limit=10");
  });

  let team, otherTeam, player;
  await check("teams, players, roster contracts and profile photo selection", async () => {
    team = (await request("POST", "/team", { name: "Integration Alpha" }, staffCookie, 201)).json()
      .team;
    otherTeam = (
      await request("POST", "/team", { name: "Integration Beta" }, staffCookie, 201)
    ).json().team;
    player = (
      await request(
        "POST",
        "/player",
        {
          name: "Integration Player",
          teamId: team.id,
          nationality: "FR",
          imageUrl: "https://example.test/original.jpg",
        },
        staffCookie,
        201,
      )
    ).json().player;
    assert.equal((await request("GET", `/player/${player.id}`)).json().player.team.id, team.id);
    const photo = (
      await request(
        "POST",
        `/player/${player.id}/photo`,
        { url: "https://example.test/profile.jpg" },
        staffCookie,
        201,
      )
    ).json().photo;
    assert.equal(
      (
        await request(
          "PATCH",
          `/player/${player.id}/photo/${photo.id}/set-profile`,
          {},
          staffCookie,
        )
      ).json().player.imageUrl,
      photo.url,
    );
    assert.equal(
      (await request("GET", `/player/slug/${player.slug}`))
        .json()
        .player.photos.includes("https://example.test/original.jpg"),
      true,
    );
    const contract = (
      await request(
        "POST",
        `/player/${player.id}/contract`,
        { teamId: team.id, startDate: "2026-01-01" },
        staffCookie,
        201,
      )
    ).json().contract;
    assert.equal(contract.team.id, team.id);
    assert.equal((await request("GET", `/team/${team.id}/contract`)).json().contracts.length, 1);
    assert.equal((await request("GET", `/team/${team.id}`)).json().team.players[0].id, player.id);
  });

  let tournament, match;
  await check(
    "manual tournament, real Redis DTO cache and TTL, match creation and reads",
    async () => {
      tournament = (
        await request(
          "POST",
          "/tournaments",
          { name: "Integration Cup", teamIds: [team.id, otherTeam.id] },
          staffCookie,
          201,
        )
      ).json().tournament;
      assert.equal(tournament.source, "manual");
      assert.equal(tournament.participants.length, 2);
      await request(
        "POST",
        `/tournaments/${tournament.id}/enable-pickems`,
        { enabled: true },
        staffCookie,
        201,
      );
      match = (
        await request(
          "POST",
          `/tournaments/${tournament.id}/matches`,
          {
            name: "Integration Final",
            participantIds: tournament.participants.map((p) => p.id),
            beginAt: new Date(Date.now() + 86_400_000).toISOString(),
            status: "not_started",
          },
          staffCookie,
          201,
        )
      ).json().match;
      assert(match.id);
      await request("GET", `/matches/${match.id}`);
      assert.equal(
        (await request("GET", `/matches/upcoming?tournamentId=${tournament.id}`)).json().total,
        1,
      );
      const first = (await request("GET", `/tournaments/${tournament.id}`)).json();
      const second = (await request("GET", `/tournaments/${tournament.id}`)).json();
      assert.deepEqual(first, second);
      assert.match(first.tournament.matches[0].beginAt, /^\d{4}-\d{2}-\d{2}T/);
      assert.equal(first.tournament.participants[0].team.id, tournament.participants[0].team.id);
      const ttl = await redis.ttl(`tournament:${tournament.id}`);
      assert(ttl > 0 && ttl <= 60, `cache TTL is seconds, observed ${ttl}`);
      await request(
        "PATCH",
        `/tournaments/${tournament.id}`,
        { name: "Integration Cup Updated" },
        staffCookie,
      );
      assert.equal(await redis.exists(`tournament:${tournament.id}`), 0);
      assert.equal(
        (await request("GET", `/tournaments/${tournament.id}`)).json().tournament.name,
        "Integration Cup Updated",
      );
      const { RedisService } = rows("infrastructure/redis/redis.service");
      await app.get(RedisService).set("integration:expires", "value", 1);
      assert.equal(await redis.get("integration:expires"), "value");
      await delay(1100);
      assert.equal(await redis.get("integration:expires"), null);
    },
  );

  await check("concurrent picks preserve unique user/match and scoring is idempotent", async () => {
    const participantId = tournament.participants[0].id;
    await Promise.all(
      Array.from({ length: 4 }, () =>
        request(
          "POST",
          `/pickem/match/${match.id}/pick`,
          { pickedParticipantId: participantId },
          memberCookie,
          201,
        ),
      ),
    );
    assert.equal(
      await orm.em.fork().count(PickemChoice, { user: { id: member.id }, match: { id: match.id } }),
      1,
    );
    await request(
      "PUT",
      `/tournaments/matches/${match.id}/winner`,
      { winnerId: participantId },
      staffCookie,
    );
    await request("POST", `/pickem/matches/${match.id}/validate`, {}, staffCookie, 201);
    assert.equal(
      (await request("POST", `/pickem/matches/${match.id}/validate`, {}, staffCookie, 201)).json()
        .updated,
      0,
    );
    const picks = (
      await request(
        "GET",
        `/pickem/tournament/${tournament.id}/user/picks`,
        undefined,
        memberCookie,
      )
    ).json().picks;
    assert.equal(picks.length, 1);
    assert.equal(picks[0].points, 5);
    assert.equal(picks[0].scored, true);
    assert.equal(
      (await request("GET", `/pickem/tournament/${tournament.id}/leaderboard`)).json()
        .leaderboard[0].points,
      5,
    );
    await request(
      "POST",
      `/pickem/match/${match.id}/pick`,
      { pickedParticipantId: participantId },
      memberCookie,
      400,
    );
  });

  let rootReply, childReply;
  await check(
    "comment threads, direct reply notifications, reporting and cascading deletion",
    async () => {
      rootReply = (
        await request(
          "POST",
          "/replies",
          { content: "Root comment", newsArticleId: article.id },
          staffCookie,
          201,
        )
      ).json().reply;
      childReply = (
        await request(
          "POST",
          "/replies",
          { content: "A reply", newsArticleId: article.id, replyToId: rootReply.id },
          memberCookie,
          201,
        )
      ).json().reply;
      const thread = (
        await request(
          "GET",
          `/replies?targetType=newsArticle&targetId=${article.id}&page=0&limit=10`,
        )
      ).json();
      assert.equal(thread.total, 1);
      assert.equal(thread.replies[0].replies[0].id, childReply.id);
      assert.equal(
        (await request("GET", "/notifications/unread-count", undefined, staffCookie)).json().count,
        1,
      );
      const notifications = (await request("GET", "/notifications", undefined, staffCookie)).json()
        .notifications;
      assert.equal(notifications.length, 1);
      await request("PATCH", "/notifications/read", { ids: [notifications[0].id] }, staffCookie);
      assert.equal(
        (await request("GET", "/notifications/unread-count", undefined, staffCookie)).json().count,
        0,
      );
      await request(
        "POST",
        `/replies/${rootReply.id}/report`,
        { reason: "spam" },
        memberCookie,
        201,
      );
      await request(
        "POST",
        `/replies/${rootReply.id}/report`,
        { reason: "spam" },
        memberCookie,
        409,
      );
      await request("GET", "/moderation/replies", undefined, memberCookie, 403);
      await request("GET", "/moderation/replies", undefined, staffCookie);
      await request("DELETE", `/replies/${rootReply.id}`, undefined, staffCookie, 204);
      assert.equal(
        await orm.em.fork().count(Reply, { id: { $in: [rootReply.id, childReply.id] } }),
        0,
      );
      assert.equal(await orm.em.fork().count(ReplyNotification, {}), 0);
      assert.equal(await orm.em.fork().count(ReplyReport, {}), 0);
    },
  );

  await check("real reply + notification transaction rolls back both flushed writes", async () => {
    const { transactionalReplies } = rows("reply/infrastructure/composition");
    const em = orm.em.fork();
    const id = randomUUID();
    const failure = new Error("injected after second SQL write");
    await assert.rejects(
      () =>
        RequestContext.create(em, () =>
          transactionalReplies(em).run(async (scope) => {
            await scope.replies.save({
              id,
              content: "Must roll back",
              createdAt: new Date(),
              hiddenAt: null,
              author: { id: member.id, userName: member.userName },
              post: null,
              newsArticle: { id: article.id, title: article.title, slug: article.slug },
              match: null,
              replyTo: null,
            });
            await scope.notifications.createForDirectReply(staff.id, id);
            const tx = TransactionContext.getEntityManager();
            assert(tx, "the adapter provides a real transaction context");
            await tx.flush();
            assert.equal(await tx.count(Reply, { id }), 1);
            assert.equal(await tx.count(ReplyNotification, { reply: { id } }), 1);
            throw failure;
          }),
        ),
      (error) => error === failure,
    );
    assert.equal(await orm.em.fork().count(Reply, { id }), 0);
    assert.equal(await orm.em.fork().count(ReplyNotification, { reply: { id } }), 0);
  });

  await check(
    "notification SQL constraint failure rolls back an already inserted reply",
    async () => {
      const { transactionalReplies } = rows("reply/infrastructure/composition");
      const { ForeignKeyConstraintViolationException } = require("@mikro-orm/core");
      const em = orm.em.fork();
      const id = randomUUID();
      await assert.rejects(
        () =>
          RequestContext.create(em, () =>
            transactionalReplies(em).run(async (scope) => {
              const tx = TransactionContext.getEntityManager();
              assert(tx, "the adapter provides a real transaction context");
              await scope.replies.save({
                id,
                content: "Rolled back after SQL constraint",
                createdAt: new Date(),
                hiddenAt: null,
                author: { id: member.id, userName: member.userName },
                post: null,
                newsArticle: { id: article.id, title: article.title, slug: article.slug },
                match: null,
                replyTo: null,
              });
              await tx.flush();
              assert.equal(
                await tx.count(Reply, { id }),
                1,
                "first SQL insert happened before the failure",
              );
              await scope.notifications.createForDirectReply(randomUUID(), id);
              await tx.flush();
              assert.fail(
                "the notification recipient foreign key must reject the second SQL write",
              );
            }),
          ),
        (error) =>
          error instanceof ForeignKeyConstraintViolationException &&
          error.code === "23503" &&
          error.constraint === "reply_notification_recipient_id_foreign",
      );
      assert.equal(await orm.em.fork().count(Reply, { id }), 0);
      assert.equal(await orm.em.fork().count(ReplyNotification, { reply: { id } }), 0);
    },
  );

  await check("real roster + photo transaction rolls back both flushed writes", async () => {
    const { MikroRosterTransaction } = rows("player/infrastructure/persistence/roster.store");
    const { PlayerPhoto } = rows("player/domain/roster");
    const em = orm.em.fork();
    const before = await em.findOneOrFail(rosterRows.Player, { id: player.id });
    const original = before.imageUrl;
    const photo = new PlayerPhoto();
    const failure = new Error("injected after player and photo SQL writes");
    await assert.rejects(
      () =>
        RequestContext.create(em, () =>
          new MikroRosterTransaction(em).run(async (scope) => {
            const model = await scope.players.findById(player.id);
            model.imageUrl = "https://example.test/rolled-back.jpg";
            await scope.players.save(model);
            photo.player = model;
            photo.url = "https://example.test/rollback-archive.jpg";
            await scope.photos.save(photo);
            const tx = TransactionContext.getEntityManager();
            assert(tx, "the adapter provides a real transaction context");
            await tx.flush();
            assert.equal(await tx.count(rosterRows.PlayerPhoto, { id: photo.id }), 1);
            assert.equal(
              (await tx.findOneOrFail(rosterRows.Player, { id: player.id })).imageUrl,
              model.imageUrl,
            );
            throw failure;
          }),
        ),
      (error) => error === failure,
    );
    assert.equal(await orm.em.fork().count(rosterRows.PlayerPhoto, { id: photo.id }), 0);
    assert.equal(
      (await orm.em.fork().findOneOrFail(rosterRows.Player, { id: player.id })).imageUrl,
      original,
    );
  });

  await check(
    "PAT secrets are hashed, use current roles, reject revoked tokens over HTTP",
    async () => {
      const token = (
        await request("POST", "/pat/tokens", { name: "Integration token" }, staffCookie, 201)
      ).json();
      const stored = await orm.em.fork().findOneOrFail(PersonalAccessToken, { id: token.id });
      assert.notEqual(stored.tokenHash, token.token);
      assert.equal(stored.tokenHash, createHash("sha256").update(token.token).digest("hex"));
      const listed = (await request("GET", "/pat/tokens", undefined, staffCookie)).json().tokens;
      assert(!("tokenHash" in listed[0]) && !("token" in listed[0]));
      const patHeaders = { authorization: `Bearer ${token.token}` };
      await request("GET", "/mcp", undefined, undefined, 405, patHeaders);
      await orm.em.fork().nativeUpdate(User, { id: staff.id }, { role: "journalist" });
      assert.equal(
        await RequestContext.create(orm.em.fork(), () =>
          app.get(PatService).resolveUser(token.token),
        ).then((user) => user.role),
        "journalist",
      );
      await orm.em.fork().nativeUpdate(User, { id: staff.id }, { role: null });
      await request("GET", "/mcp", undefined, undefined, 401, patHeaders);
      await orm.em.fork().nativeUpdate(User, { id: staff.id }, { role: "admin" });
      await request("DELETE", `/pat/tokens/${token.id}`, undefined, staffCookie, 204);
      await request("GET", "/mcp", undefined, undefined, 401, patHeaders);
      await request("POST", "/pat/tokens", { name: "Denied" }, memberCookie, 403);
    },
  );

  await check(
    "forum topics, post translations, cooldown, recent activity and deletion",
    async () => {
      const overview = (await request("GET", "/forum")).json();
      assert.equal(overview.totalTopics, 4);
      const id = randomUUID();
      await request(
        "POST",
        "/posts",
        {
          id,
          title: "Integration Discussion",
          content: "Forum content",
          topicId: overview.topics[0].id,
          translations: [
            { locale: "fr-FR", title: "Discussion intégration", content: "Contenu français" },
          ],
        },
        staffCookie,
        204,
      );
      assert.equal(
        (await request("GET", `/posts/${id}`)).json().post.title,
        "Integration Discussion",
      );
      assert.equal(
        (
          await request("GET", `/posts/${id}`, undefined, undefined, 200, {
            "accept-language": "fr-FR",
          })
        ).json().post.title,
        "Discussion intégration",
      );
      assert.equal(
        (await request("GET", "/posts/creation-status", undefined, staffCookie)).json().canCreate,
        false,
      );
      assert.equal((await request("GET", "/forum/preview")).json().recentPosts[0].id, id);
      await request("DELETE", `/posts/${id}`, undefined, memberCookie, 403);
      await request("DELETE", `/posts/${id}`, undefined, staffCookie, 204);
      assert.equal((await request("GET", `/posts/${id}`)).json().post, null);
    },
  );

  await check("daily AirRiddle persistence and exact guess use the real player store", async () => {
    const today = (await request("GET", "/air-riddle/today")).json();
    assert.equal(today.length, player.name.length);
    const guessed = (
      await request("POST", "/air-riddle/guess", { guess: player.name, last: true }, undefined, 201)
    ).json();
    assert.equal(guessed.answer, player.name);
    assert.equal(guessed.results.length, player.name.length);
    assert.equal((await request("GET", "/air-riddle/today")).json().length, today.length);
  });

  await check("search projections and real PostgreSQL/Redis health", async () => {
    const found = (await request("GET", "/search?q=Integration&type=all&limit=20&offset=0")).json();
    assert(found.players.some((p) => p.id === player.id));
    assert(found.teams.some((t) => t.id === team.id));
    assert(found.tournaments.some((t) => t.id === tournament.id));
    assert.equal((await request("GET", "/health/live")).json().status, "ok");
    const ready = (await request("GET", "/health/ready")).json();
    assert.equal(ready.status, "ok");
    assert.equal(ready.info.postgres.status, "up");
    assert.equal(ready.info.redis.status, "up");
  });
  process.stdout.write(`Integration verification passed (${results.length} scenarios).\n`);
} catch (error) {
  process.stderr.write(`${error.stack ?? error}\nCompleted scenarios: ${results.length}\n`);
  process.exitCode = 1;
} finally {
  const closed = await Promise.allSettled([redis?.quit(), app?.close()]);
  for (const result of closed) {
    if (result.status === "rejected") {
      process.stderr.write(`Application cleanup failed: ${result.reason}\n`);
      process.exitCode = 1;
    }
  }
  for (const name of containers.reverse()) {
    try {
      docker("rm", "--force", name);
    } catch (error) {
      process.stderr.write(`Cleanup failed for ${name}: ${error.message}\n`);
      process.exitCode = 1;
    }
  }
}
