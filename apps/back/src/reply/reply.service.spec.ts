import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { QueryOrder } from "@mikro-orm/core";
import { EntityManager } from "@mikro-orm/postgresql";
import { ReplyReportRepository } from "./reply-report.repository";
import { ReplyRepository } from "./reply.repository";
import { ReplyService } from "./reply.service";
import { UserService } from "src/user/user.service";
import { FORUM_ERROR_CODES } from "src/forum/forum.constants";
import { Reply } from "src/forum/forum.entities";
import { User } from "src/user/domain/user.entity";
import { NotificationService } from "src/notification/notification.service";
import { Match } from "src/tournament/tournament.entities";

describe("ReplyService", () => {
  let service: ReplyService;
  const replyRepository = {
    findByTarget: jest.fn(),
    findById: jest.fn(),
    findLatestByUser: jest.fn(),
    countRootsByTarget: jest.fn(),
    countByTargetIds: jest.fn(),
    findDescendantsForRoots: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findChildren: jest.fn(),
  };
  const replyReportRepository = {
    findByReplyAndReporter: jest.fn(),
    save: jest.fn(),
  };
  const userService = {
    findById: jest.fn(),
  };
  const notificationService = {
    createForDirectReply: jest.fn(),
  };
  const em = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReplyService,
        { provide: ReplyRepository, useValue: replyRepository },
        { provide: ReplyReportRepository, useValue: replyReportRepository },
        { provide: NotificationService, useValue: notificationService },
        { provide: UserService, useValue: userService },
        { provide: EntityManager, useValue: em },
      ],
    }).compile();

    service = module.get(ReplyService);
    jest.clearAllMocks();
  });

  function makeUser(id = "user-1"): User {
    return { id, userName: "fan", email: "fan@test.com" } as User;
  }

  function makeReply(partial: Partial<Reply> & { id: string }): Reply {
    return {
      content: "hello",
      createdAt: new Date("2026-01-01"),
      author: makeUser(),
      post: null,
      newsArticle: null,
      match: null,
      replyTo: null,
      replies: { getItems: () => [] } as never,
      hiddenAt: null,
      ...partial,
    } as Reply;
  }

  describe("create target validation", () => {
    it("rejects when no target is provided", async () => {
      await expect(service.create("user-1", { content: "hi" } as never)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("rejects when multiple targets are provided", async () => {
      await expect(
        service.create("user-1", {
          content: "hi",
          postId: "11111111-1111-4111-8111-111111111111",
          matchId: "22222222-2222-4222-8222-222222222222",
        } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

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

    it("rate-limits consecutive creates", async () => {
      replyRepository.findLatestByUser.mockResolvedValue(
        makeReply({ id: "r1", createdAt: new Date() }),
      );

      await expect(
        service.create("user-1", {
          content: "spam",
          matchId: "22222222-2222-4222-8222-222222222222",
        }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: FORUM_ERROR_CODES.REPLY_RATE_LIMITED,
        }),
      });
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
      ).rejects.toBeInstanceOf(BadRequestException);
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
      ).rejects.toBeInstanceOf(NotFoundException);
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
        order: QueryOrder.DESC,
        limit: 25,
        offset: 0,
        rootsOnly: true,
      });
      expect(replyRepository.findDescendantsForRoots).toHaveBeenCalledWith("match", "m1", ["root"]);
    });

    it("uses oldest-first ordering for forum posts", async () => {
      replyRepository.countRootsByTarget.mockResolvedValue(2);
      replyRepository.findByTarget.mockResolvedValue([
        makeReply({ id: "a", post: { id: "p1" } as never }),
      ]);
      replyRepository.findDescendantsForRoots.mockResolvedValue([]);

      await service.findByTargetPaginated("forumPost", "p1", 0, 2);

      expect(replyRepository.findByTarget).toHaveBeenCalledWith("forumPost", "p1", {
        order: QueryOrder.ASC,
        limit: 2,
        offset: 0,
        rootsOnly: true,
      });
    });

    it("uses countRootsByTarget for total and does not load all replies", async () => {
      replyRepository.countRootsByTarget.mockResolvedValue(40);
      replyRepository.findByTarget.mockResolvedValue([]);
      replyRepository.findDescendantsForRoots.mockResolvedValue([]);

      const result = await service.findByTargetPaginated("newsArticle", "n1", 1, 10);

      expect(result.total).toBe(40);
      expect(replyRepository.countRootsByTarget).toHaveBeenCalledWith("newsArticle", "n1");
      expect(replyRepository.findByTarget).toHaveBeenCalledWith("newsArticle", "n1", {
        order: QueryOrder.DESC,
        limit: 10,
        offset: 10,
        rootsOnly: true,
      });
      expect(replyRepository.findDescendantsForRoots).toHaveBeenCalledWith("newsArticle", "n1", []);
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

      const result = await service.report("r1", "reporter-1", "spam");

      expect(replyReportRepository.save).toHaveBeenCalled();
      expect(result.reason).toBe("spam");
    });
  });
});
