import { describe, expect, it } from "vitest";
import { CreateReplyDto, ReplyContentDto } from "./create-reply.dto";

interface CreateReplyDtoPlain {
  content?: string;
  postId?: string;
  newsArticleId?: string;
  matchId?: string;
  replyToId?: string;
}

describe("CreateReplyDto", () => {
  async function validateDto(plain: CreateReplyDtoPlain) {
    const result = CreateReplyDto.safeParse(plain);
    return result.success ? [] : result.error.issues;
  }

  it("accepts a single match target", async () => {
    const errors = await validateDto({
      content: "Nice clutch",
      matchId: "22222222-2222-4222-8222-222222222222",
    });
    expect(errors).toHaveLength(0);
  });

  it("trims content", async () => {
    const dto = CreateReplyDto.parse({
      content: "  padded  ",
      matchId: "22222222-2222-4222-8222-222222222222",
    });
    expect(dto.content).toBe("padded");
  });

  it("rejects when no target is set", async () => {
    const errors = await validateDto({ content: "hi" });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects when two targets are set", async () => {
    const errors = await validateDto({
      content: "hi",
      postId: "11111111-1111-4111-8111-111111111111",
      matchId: "22222222-2222-4222-8222-222222222222",
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects empty content", async () => {
    const errors = await validateDto({
      content: "",
      matchId: "22222222-2222-4222-8222-222222222222",
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it.each(["   ", "a".repeat(2049)])("rejects blank or oversized content", (content) => {
    expect(
      CreateReplyDto.safeParse({ content, matchId: "22222222-2222-4222-8222-222222222222" })
        .success,
    ).toBe(false);
  });

  it("validates article reply content without accepting a caller-supplied target", () => {
    expect(ReplyContentDto.parse({ content: " hi " })).toEqual({ content: "hi" });
    expect(
      ReplyContentDto.safeParse({ content: "hi", matchId: "22222222-2222-4222-8222-222222222222" })
        .success,
    ).toBe(false);
  });
});
