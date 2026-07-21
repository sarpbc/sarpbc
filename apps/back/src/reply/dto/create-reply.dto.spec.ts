import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { CreateReplyDto } from "./create-reply.dto";

describe("CreateReplyDto", () => {
  async function validateDto(plain: Record<string, unknown>) {
    const dto = plainToInstance(CreateReplyDto, plain);
    return validate(dto);
  }

  it("accepts a single match target", async () => {
    const errors = await validateDto({
      content: "Nice clutch",
      matchId: "22222222-2222-4222-8222-222222222222",
    });
    expect(errors).toHaveLength(0);
  });

  it("trims content", async () => {
    const dto = plainToInstance(CreateReplyDto, {
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
});
