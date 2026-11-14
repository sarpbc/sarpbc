import { log } from "evlog";
import { describe, expect, it, vi } from "vitest";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import type { PatUser } from "../../pat/application/pat.service";
import { defineTool } from "./define-tool";

const logInfo = vi.spyOn(log, "info");
const logError = vi.spyOn(log, "error");

const textContent = (result: CallToolResult): string => {
  const [block] = result.content;

  return block?.type === "text" ? block.text : "";
};

const admin: PatUser = { id: "user-1", email: "admin@test.com", role: "admin" };
const journalist: PatUser = { id: "user-2", email: "journalist@test.com", role: "journalist" };

const write = (handler: () => Promise<{ result: object; entityId?: string }>) =>
  defineTool({
    name: "set_match_winner",
    description: "Set a winner.",
    write: true,
    permission: "tournaments.manage",
    input: { matchId: z.string() },
    handler,
  });

type WriteHandler = Parameters<typeof write>[0];

const read = (permission?: "news.manage" | readonly ["players.manage", "teams.manage"]) =>
  defineTool({
    name: "get_thing",
    description: "Get a thing.",
    permission,
    input: {},
    handler: async () => ({ slug: "zen-joins-karmine-corp" }),
  });

const failing = (cause: Error) =>
  defineTool({
    name: "get_thing",
    description: "Get a thing.",
    input: {},
    handler: async () => {
      throw cause;
    },
  });

describe(defineTool, () => {
  describe("write tools", () => {
    it("denies a role without the permission and never runs the handler", async () => {
      const handler = vi.fn<WriteHandler>(async () => ({ result: { ok: true } }));
      const result = await write(handler).run(journalist, { matchId: "m1" });

      expect(result.isError).toBe(true);
      expect(textContent(result)).toContain("tournaments.manage");
      expect(handler).not.toHaveBeenCalled();
    });

    it("returns the result as JSON and logs the entity", async () => {
      const result = await write(async () => ({
        result: { matchId: "match-1" },
        entityId: "match-1",
      })).run(admin, { matchId: "m1" });

      expect(result.isError).toBeUndefined();
      expect(textContent(result)).toContain("match-1");
      expect(logInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          tool: "set_match_winner",
          entityId: "match-1",
          userId: "user-1",
        }),
      );
    });
  });

  describe("read tools", () => {
    it("lets any valid token read when no permission is declared", async () => {
      expect(textContent(await read().run(journalist, {}))).toContain("zen-joins-karmine-corp");
    });

    it("gates a staff read on its permission", async () => {
      const gated = read("news.manage");
      const runResult = await gated.run(journalist, {});
      expect(runResult.isError).toBeUndefined();
      const denied = read(["players.manage", "teams.manage"]);
      const runResult2 = await denied.run(journalist, {});
      expect(runResult2.isError).toBe(true);
    });

    it("accepts any one of several permissions", async () => {
      const tool = defineTool({
        name: "list_things",
        description: "List things.",
        permission: ["tournaments.manage", "news.manage"],
        input: {},
        handler: async () => ({ ok: true }),
      });

      const runResult3 = await tool.run(journalist, {});
      expect(runResult3.isError).toBeUndefined();
      expect(tool.description).toBe("List things. Requires tournaments.manage or news.manage.");
    });
  });

  describe("failures", () => {
    it("forwards the message of an application error and logs it", async () => {
      const result = await failing(new NotFoundError("Tournament not found")).run(admin, {});

      expect(result.isError).toBe(true);
      expect(textContent(result)).toBe("Tournament not found");
      expect(logError).toHaveBeenCalledWith(expect.objectContaining({ tool: "get_thing" }));
    });

    it("hides the message of any other error behind a generic one", async () => {
      const result = await failing(new Error("connect ECONNREFUSED 10.0.0.5:5432")).run(admin, {});

      expect(result.isError).toBe(true);
      expect(textContent(result)).not.toContain("ECONNREFUSED");
      expect(textContent(result)).toContain("was logged");
      expect(logError).toHaveBeenCalledExactlyOnceWith({
        component: "McpTool",
        error: new Error("connect ECONNREFUSED 10.0.0.5:5432"),
        message: "get_thing failed",
        tool: "get_thing",
        userId: "user-1",
      });
    });
  });

  it("appends the required permission to the description once", () => {
    const tool = defineTool({
      name: "create_league",
      description: "Create a league.",
      write: true,
      permission: "tournaments.manage",
      input: {},
      handler: async () => ({ result: {} }),
    });

    expect(tool.description).toBe("Create a league. Requires tournaments.manage.");
  });
});
