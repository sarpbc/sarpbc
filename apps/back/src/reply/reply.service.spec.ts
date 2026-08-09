import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { EntityManager } from "@mikro-orm/postgresql";
import { ReplyService } from "./reply.service";
import { ReplyRepository } from "./reply.repository";
import { UserService } from "src/user/user.service";
import { FORUM_ERROR_CODES } from "src/forum/forum.constants";
import { Reply } from "src/forum/forum.entities";
import { User } from "src/user/domain/user.entity";
import { Match } from "src/tournament/tournament.entities";

describe("ReplyService", () => {
  let service: ReplyService;
  const replyRepository = {
    findByPostId: jest.fn(),
    findByNewsArticleId: jest.fn(),
    findByMatchId: jest.fn(),
    findById: jest.fn(),
    findLatestByUser: jest.fn(),
    countRootsByTarget: jest.fn(),
    countByTargetIds: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findChildren: jest.fn(),
  };
  const userService = {
    findById: jest.fn(),
  };
  const em = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReplyService,
        { provide: ReplyRepository, useValue: replyRepository },
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

  describe("findByTarget", () => {
    it("threads nested replies for a match", async () => {
      const root = makeReply({
        id: "root",
        match: { id: "m1" } as Match,
      });
      const child = makeReply({
        id: "child",
        match: { id: "m1" } as Match,
        replyTo: root,
      });
      replyRepository.findByMatchId.mockResolvedValue([root, child]);

      const result = await service.findByTarget("match", "m1");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("root");
      expect(result[0].replies).toHaveLength(1);
      expect(result[0].replies[0].id).toBe("child");
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
});
