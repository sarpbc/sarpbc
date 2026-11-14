import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import type { Author } from "../../common/domain/author";
import type { ReplyTarget } from "../domain/reply";
import type { ReplyRecord } from "./models";
import type { ReplyWrites, ReplyWriteScope } from "./ports";

import { ReplyService } from "./reply.service";

type Match = NonNullable<ReplyRecord["match"]>;

const NOW = new Date("2026-06-01T12:00:00Z");
const GENERATED_ID = "generated-id";

const matchFor = (id: string): Match => ({ id, publicId: 1, name: "Match", slug: "match" });

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

describe(ReplyService, () => {
  let service: ReplyService;

  const replyRepository = {
    findByTarget: vi.fn<ReplyWrites["findByTarget"]>(),
    findById: vi.fn<ReplyWrites["findById"]>(),
    findLatestByUser: vi.fn<ReplyWrites["findLatestByUser"]>(),
    countRootsByTarget: vi.fn<ReplyWrites["countRootsByTarget"]>(),
    countByTargetIds: vi.fn<ReplyWrites["countByTargetIds"]>(),
    findDescendantsForRoots: vi.fn<ReplyWrites["findDescendantsForRoots"]>(),
    save: vi.fn<ReplyWrites["save"]>(),
    delete: vi.fn<ReplyWrites["delete"]>(),
    findChildren: vi.fn<ReplyWrites["findChildren"]>(),
  };

  const replyReportRepository = {
    findByReplyAndReporter: vi.fn<ReplyWriteScope["reports"]["findByReplyAndReporter"]>(),
    save: vi.fn<ReplyWriteScope["reports"]["save"]>(),
  };

  const userService = {
    findById: vi.fn<ReplyWriteScope["users"]["findById"]>(),
  };

  const notificationService = {
    createForDirectReply: vi.fn<ReplyWriteScope["notifications"]["createForDirectReply"]>(),
  };

  const em = {
    findOne: vi.fn<(target: ReplyTarget) => Promise<Match | null>>(),
  };

  beforeEach(async () => {
    const scope: ReplyWriteScope = {
      replies: {
        ...replyRepository,
        findRecentForModeration: vi.fn<ReplyWrites["findRecentForModeration"]>(),
      },
      reports: replyReportRepository,
      users: userService,
      notifications: notificationService,
      targets: {
        async find(target: ReplyTarget) {
          const row = await em.findOne(target);

          if (row === null) {
            return null;
          }

          return { post: null, newsArticle: null, match: row };
        },
      },
    };

    service = new ReplyService(
      scope.replies,
      { run: async (work) => await work(scope) },
      () => NOW,
      () => GENERATED_ID,
    );
    vi.clearAllMocks();
  });

  describe("create target validation", () => {
    it("creates a match-targeted reply", async () => {
      replyRepository.findLatestByUser.mockResolvedValue(null);
      userService.findById.mockResolvedValue(makeUser());
      const match = matchFor("22222222-2222-4222-8222-222222222222");
      em.findOne.mockResolvedValue(match);
      replyRepository.save.mockResolvedValue(undefined);

      const result = await service.create("user-1", {
        content: "  Great series  ",
        matchId: match.id,
      });

      expect(replyRepository.save).toHaveBeenCalledExactlyOnceWith({
        id: GENERATED_ID,
        content: "Great series",
        author: makeUser(),
        createdAt: NOW,
        hiddenAt: null,
        post: null,
        newsArticle: null,
        match,
        replyTo: null,
      });
      expect(result.content).toBe("Great series");
      expect(result.author.userName).toBe("fan");
      expect(result.replies).toStrictEqual([]);
    });

    it("rejects empty trimmed content", async () => {
      replyRepository.findLatestByUser.mockResolvedValue(null);
      userService.findById.mockResolvedValue(makeUser());
      em.findOne.mockResolvedValue(matchFor("22222222-2222-4222-8222-222222222222"));

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
        match: matchFor("m1"),
      });

      const child = makeReply({
        id: "child",
        match: matchFor("m1"),
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
    });

    it("queries root replies of the target, then their descendants", async () => {
      const root = makeReply({
        id: "root",
        match: matchFor("m1"),
      });

      replyRepository.countRootsByTarget.mockResolvedValue(1);
      replyRepository.findByTarget.mockResolvedValue([root]);
      replyRepository.findDescendantsForRoots.mockResolvedValue([]);

      await service.findByTargetPaginated("match", "m1", 0, 25);

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

      expect(replyReportRepository.save).toHaveBeenCalledExactlyOnceWith({
        id: GENERATED_ID,
        reply,
        reporter: makeUser("reporter-1"),
        reason: "spam",
        createdAt: NOW,
      });
      expect(result.reason).toBe("spam");
    });
  });
});
