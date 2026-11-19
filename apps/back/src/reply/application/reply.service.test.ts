import { beforeEach, describe, expect, it } from "vitest";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import type { ReplyRecord } from "./models";
import { InMemoryReplyScope } from "./reply-store.test-utils";
import { ReplyService } from "./reply.service";

const NOW = new Date("2026-06-01T12:00:00Z");
const GENERATED_ID = "generated-id";

const matchFor = (id: string) => ({ id, name: "Match", publicId: 1, slug: "match" });

const makeUser = (id = "user-1") => ({ id, userName: "fan" });

const makeReply = (partial: Partial<ReplyRecord> & { id: string }) => ({
  author: makeUser(),
  content: "hello",
  createdAt: new Date("2026-01-01"),
  hiddenAt: null,
  match: null,
  newsArticle: null,
  post: null,
  replyTo: null,
  ...partial,
});

describe(ReplyService, () => {
  let service: ReplyService;
  let scope: InMemoryReplyScope;

  const matchTarget = (match: ReturnType<typeof matchFor>) => {
    scope.addTarget({ id: match.id, kind: "match" }, { match, newsArticle: null, post: null });
  };

  beforeEach(() => {
    scope = new InMemoryReplyScope();
    service = new ReplyService(
      scope.replies,
      scope,
      () => NOW,
      () => GENERATED_ID,
    );
  });

  describe("create target validation", () => {
    it("creates a match-targeted reply", async () => {
      scope.addUser(makeUser());
      const match = matchFor("22222222-2222-4222-8222-222222222222");
      matchTarget(match);

      const result = await service.create("user-1", {
        content: "  Great series  ",
        matchId: match.id,
      });

      expect(scope.replies.saved).toStrictEqual([
        {
          author: makeUser(),
          content: "Great series",
          createdAt: NOW,
          hiddenAt: null,
          id: GENERATED_ID,
          match,
          newsArticle: null,
          post: null,
          replyTo: null,
        },
      ]);
      expect(result.content).toBe("Great series");
      expect(result.author.userName).toBe("fan");
      expect(result.replies).toStrictEqual([]);
    });

    it("rejects empty trimmed content", async () => {
      scope.addUser(makeUser());
      matchTarget(matchFor("22222222-2222-4222-8222-222222222222"));

      await expect(
        service.create("user-1", {
          content: "   ",
          matchId: "22222222-2222-4222-8222-222222222222",
        }),
      ).rejects.toBeInstanceOf(InvalidInputError);
    });

    it("throws when match does not exist", async () => {
      scope.addUser(makeUser());

      await expect(
        service.create("user-1", {
          content: "hi",
          matchId: "22222222-2222-4222-8222-222222222222",
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("findByTargetPaginated", () => {
    it("paginates root replies and threads descendants for a match", async () => {
      const root = makeReply({
        id: "root",
        match: matchFor("m1"),
      });

      const child = makeReply({
        id: "child",
        match: matchFor("m1"),
        replyTo: root,
      });

      scope.replies.add(root);
      scope.replies.add(child);

      const result = await service.findByTargetPaginated("match", "m1", 0, 25);

      expect(result.total).toBe(1);
      expect(result.replies).toHaveLength(1);
      expect(result.replies[0].id).toBe("root");
      expect(result.replies[0].replies).toHaveLength(1);
      expect(result.replies[0].replies[0].id).toBe("child");
    });

    it("reports the total of root replies and pages by the requested page", async () => {
      for (let index = 0; index < 40; index += 1) {
        scope.replies.add(
          makeReply({
            createdAt: new Date(Date.UTC(2026, 0, 1, index)),
            id: `root-${index}`,
            newsArticle: { id: "n1", slug: "news", title: "News" },
          }),
        );
      }

      const result = await service.findByTargetPaginated("newsArticle", "n1", 1, 10);

      expect(result).toMatchObject({ total: 40 });
      expect(result.replies.map(({ id }) => id)).toStrictEqual([
        "root-29",
        "root-28",
        "root-27",
        "root-26",
        "root-25",
        "root-24",
        "root-23",
        "root-22",
        "root-21",
        "root-20",
      ]);
    });

    it("fills a page with root replies only and threads their children beneath them", async () => {
      const article = { id: "n1", slug: "news", title: "News" };

      for (let index = 0; index < 6; index += 1) {
        const root = makeReply({
          createdAt: new Date(Date.UTC(2026, 0, 1, index)),
          id: `root-${index}`,
          newsArticle: article,
        });

        scope.replies.add(root);

        scope.replies.add(
          makeReply({
            createdAt: new Date(Date.UTC(2026, 0, 2, index)),
            id: `child-${index}`,
            newsArticle: article,
            replyTo: root,
          }),
        );
      }

      const result = await service.findByTargetPaginated("newsArticle", "n1", 0, 3);

      expect(result.total).toBe(6);
      expect(result.replies.map(({ id }) => id)).toStrictEqual(["root-5", "root-4", "root-3"]);
      expect(result.replies.map(({ replies }) => replies.map(({ id }) => id))).toStrictEqual([
        ["child-5"],
        ["child-4"],
        ["child-3"],
      ]);
    });
  });

  describe("hide", () => {
    it("sets hiddenAt", async () => {
      const reply = makeReply({ id: "r1" });
      scope.replies.add(reply);

      await service.hide("r1");

      expect(reply.hiddenAt).toBeInstanceOf(Date);
      expect(scope.replies.saved).toStrictEqual([reply]);
    });
  });

  describe("report", () => {
    it("persists a report via the repository save method", async () => {
      const reply = makeReply({ author: makeUser("author-1"), id: "r1" });
      scope.replies.add(reply);
      scope.addUser(makeUser("reporter-1"));

      const result = await service.report("reporter-1", "r1", "spam");

      expect(scope.reports.saved).toStrictEqual([
        {
          createdAt: NOW,
          id: GENERATED_ID,
          reason: "spam",
          reply,
          reporter: makeUser("reporter-1"),
        },
      ]);
      expect(result.reason).toBe("spam");
    });
  });
});
