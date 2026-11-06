import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvalidInputError, NotFoundError } from "../../common/domain/errors";
import type { Author } from "../../common/domain/author";
import type { ReplyTarget } from "../domain/reply";
import type { ReplyRecord } from "./models";
import type { ReplyWriteScope } from "./ports";
type Match = NonNullable<ReplyRecord["match"]>;
import { ReplyService } from "./reply.service";

describe("ReplyService", () => {
  let service: ReplyService;
  const replyRepository = {
    findByTarget: vi.fn(),
    findById: vi.fn(),
    findLatestByUser: vi.fn(),
    countRootsByTarget: vi.fn(),
    countByTargetIds: vi.fn(),
    findDescendantsForRoots: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    findChildren: vi.fn(),
  };
  const replyReportRepository = {
    findByReplyAndReporter: vi.fn(),
    save: vi.fn(),
  };
  const userService = {
    findById: vi.fn(),
  };
  const notificationService = {
    createForDirectReply: vi.fn(),
  };
  const em = {
    findOne: vi.fn(),
  };

  beforeEach(async () => {
    const scope: ReplyWriteScope = {
      replies: { ...replyRepository, findRecentForModeration: vi.fn() },
      reports: replyReportRepository,
      users: userService,
      notifications: notificationService,
      targets: {
        async find(target: ReplyTarget) {
          const row = await em.findOne(target);
          if (!row) return null;
          return {
            post: target.kind === "forumPost" ? row : null,
            newsArticle: target.kind === "newsArticle" ? row : null,
            match: target.kind === "match" ? row : null,
          };
        },
      },
    };
    service = new ReplyService(scope.replies, { run: (work) => work(scope) });
    vi.clearAllMocks();
  });

  function makeUser(id = "user-1"): Author {
    return { id, userName: "fan" };
  }

  function makeReply(partial: Partial<ReplyRecord> & { id: string }): ReplyRecord {
    return {
      content: "hello",
      createdAt: new Date("2026-01-01"),
      author: makeUser(),
      post: null,
      newsArticle: null,
      match: null,
      replyTo: null,
      hiddenAt: null,
      ...partial,
    };
  }

  describe("create target validation", () => {
    it("creates a match-targeted reply", async () => {
      replyRepository.findLatestByUser.mockResolvedValue(null);
      userService.findById.mockResolvedValue(makeUser());
      const match = { id: "22222222-2222-4222-8222-222222222222" } as Match;
      em.findOne.mockResolvedValue(match);
      replyRepository.save.mockResolvedValue(undefined);

      const result = await service.create("user-1", {
        content: "  Great series  ",
        matchId: match.id,
      });

      expect(replyRepository.save).toHaveBeenCalled();
      expect(result.content).toBe("Great series");
      expect(result.author.userName).toBe("fan");
      expect(result.replies).toEqual([]);
    });

    it("rejects empty trimmed content", async () => {
      replyRepository.findLatestByUser.mockResolvedValue(null);
      userService.findById.mockResolvedValue(makeUser());
      em.findOne.mockResolvedValue({ id: "22222222-2222-4222-8222-222222222222" });

      await expect(
        service.create("user-1", {
          content: "   ",
          matchId: "22222222-2222-4222-8222-222222222222",
        }),
      ).rejects.toBeInstanceOf(InvalidInputError);
    });

    it("throws when match does not exist", async () => {
      replyRepository.findLatestByUser.mockResolvedValue(null);
      userService.findById.mockResolvedValue(makeUser());
      em.findOne.mockResolvedValue(null);

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
        match: { id: "m1" } as Match,
      });
      const child = makeReply({
        id: "child",
        match: { id: "m1" } as Match,
        replyTo: root,
      });
      replyRepository.countRootsByTarget.mockResolvedValue(1);
      replyRepository.findByTarget.mockResolvedValue([root]);
      replyRepository.findDescendantsForRoots.mockResolvedValue([child]);

      const result = await service.findByTargetPaginated("match", "m1", 0, 25);

      expect(result.total).toBe(1);
      expect(result.replies).toHaveLength(1);
      expect(result.replies[0].id).toBe("root");
      expect(result.replies[0].replies).toHaveLength(1);
      expect(result.replies[0].replies[0].id).toBe("child");
      expect(replyRepository.findByTarget).toHaveBeenCalledWith("match", "m1", {
        limit: 25,
        offset: 0,
        rootsOnly: true,
      });
      expect(replyRepository.findDescendantsForRoots).toHaveBeenCalledWith("match", "m1", ["root"]);
    });

    it("reports the total of root replies and pages by the requested page", async () => {
      replyRepository.countRootsByTarget.mockResolvedValue(40);
      replyRepository.findByTarget.mockResolvedValue([]);
      replyRepository.findDescendantsForRoots.mockResolvedValue([]);

      const result = await service.findByTargetPaginated("newsArticle", "n1", 1, 10);

      expect(result).toMatchObject({ total: 40, replies: [] });
      expect(replyRepository.findByTarget).toHaveBeenCalledWith("newsArticle", "n1", {
        limit: 10,
        offset: 10,
        rootsOnly: true,
      });
    });
  });

  describe("hide", () => {
    it("sets hiddenAt", async () => {
      const reply = makeReply({ id: "r1" });
      replyRepository.findById.mockResolvedValue(reply);
      replyRepository.save.mockResolvedValue(undefined);

      await service.hide("r1");

      expect(reply.hiddenAt).toBeInstanceOf(Date);
      expect(replyRepository.save).toHaveBeenCalledWith(reply);
    });
  });

  describe("report", () => {
    it("persists a report via the repository save method", async () => {
      const reply = makeReply({ id: "r1", author: makeUser("author-1") });
      replyRepository.findById.mockResolvedValue(reply);
      replyReportRepository.findByReplyAndReporter.mockResolvedValue(null);
      userService.findById.mockResolvedValue(makeUser("reporter-1"));
      replyReportRepository.save.mockResolvedValue(undefined);

      const result = await service.report("reporter-1", "r1", "spam");

      expect(replyReportRepository.save).toHaveBeenCalled();
      expect(result.reason).toBe("spam");
    });
  });
});
