import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { Match } from "../../../tournament/domain/competition";
import { BadRequestException } from "@nestjs/common";
import { registerWriteTools, requireNewsUpdateFields } from "./write-tools";

describe("requireNewsUpdateFields", () => {
  it("rejects when no field is provided", () => {
    expect(() => requireNewsUpdateFields({})).toThrow(BadRequestException);
  });

  it("accepts a single optional field", () => {
    expect(() => requireNewsUpdateFields({ title: "Zen joins Karmine Corp" })).not.toThrow();
  });

  it("accepts a null clear for French or image fields", () => {
    expect(() => requireNewsUpdateFields({ titleFr: null, imageUrl: null })).not.toThrow();
  });

  it("accepts a type-only update", () => {
    expect(() => requireNewsUpdateFields({ type: "article" })).not.toThrow();
  });
});

describe("set_match_game_vods", () => {
  function setup(role: "admin" | "journalist") {
    vi.stubEnv("FRONT_URL", "https://sarpbc.test");
    const match = Object.assign(new Match(), {
      id: "m1",
      publicId: 12,
      name: "Final",
      participants: [],
      tournament: { slug: "playoffs", event: { slug: "worlds" } },
      vods: [{ game: 5, url: "https://youtu.be/g5?t=95", language: "fr", source: "youtube" }],
    });
    const matchService = { setGameVods: vi.fn().mockResolvedValue(match) };
    const registerTool = vi.fn();
    registerWriteTools(
      { registerTool } as never,
      {
        user: { id: "u1", email: "staff@test.com", role },
        matchService,
      } as never,
    );
    const tool = registerTool.mock.calls.find((call) => call[0] === "set_match_game_vods");
    if (!tool) throw new Error("set_match_game_vods is not registered");
    return { matchService, tool };
  }

  const links = [{ url: "https://youtu.be/g5?t=95", language: "fr" }];

  it("replaces one game's links and returns the match VODs", async () => {
    const { matchService, tool } = setup("admin");
    const result = await tool[2]({ matchId: "m1", game: 5, links });
    expect(matchService.setGameVods).toHaveBeenCalledWith("m1", 5, links);
    expect(JSON.parse(result.content[0].text)).toEqual({
      id: "m1",
      vods: [{ game: 5, url: "https://youtu.be/g5?t=95", language: "fr", source: "youtube" }],
      url: expect.stringMatching(/^https:\/\/sarpbc\.test\/matches\/12\//),
    });
  });

  it("validates its input shape", () => {
    const { tool } = setup("admin");
    const schema = z.object(tool[1].inputSchema);
    expect(schema.safeParse({ matchId: "m1", game: 0, links }).success).toBe(false);
    expect(
      schema.safeParse({ matchId: "m1", game: 1, links: [{ url: "x", language: "fra" }] }).success,
    ).toBe(false);
    expect(schema.safeParse({ matchId: "m1", game: 1, links: [] }).success).toBe(true);
  });

  it("requires tournaments.manage", async () => {
    const { matchService, tool } = setup("journalist");
    expect((await tool[2]({ matchId: "m1", game: 5, links })).isError).toBe(true);
    expect(matchService.setGameVods).not.toHaveBeenCalled();
  });
});
