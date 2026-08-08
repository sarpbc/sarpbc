import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { PatUser } from "src/pat/pat.service";
import { runReadTool, runWriteTool } from "./permission-gate";

function textContent(result: CallToolResult): string {
  const block = result.content[0];
  if (block?.type === "text") {
    return block.text;
  }
  return "";
}

const admin: PatUser = { id: "user-1", email: "admin@test.com", role: "admin" };
const journalist: PatUser = { id: "user-2", email: "journalist@test.com", role: "journalist" };

describe("permission-gate", () => {
  describe("runWriteTool", () => {
    it("returns isError when the role lacks the permission", async () => {
      const result = await runWriteTool(
        journalist,
        "create_match",
        "tournaments.manage",
        async () => ({ result: { ok: true } }),
      );

      expect(result.isError).toBe(true);
      expect(textContent(result)).toContain("tournaments.manage");
    });

    it("returns JSON content when allowed and handler succeeds", async () => {
      const result = await runWriteTool(
        admin,
        "set_match_winner",
        "tournaments.manage",
        async () => ({ result: { matchId: "match-1" }, entityId: "match-1" }),
      );

      expect(result.isError).toBeUndefined();
      expect(textContent(result)).toContain("match-1");
    });

    it("returns isError when the handler throws", async () => {
      const result = await runWriteTool(
        admin,
        "set_match_winner",
        "tournaments.manage",
        async () => {
          throw new Error("Match not found");
        },
      );

      expect(result.isError).toBe(true);
      expect(textContent(result)).toBe("Match not found");
    });
  });

  describe("runReadTool", () => {
    it("returns isError when the handler throws", async () => {
      const result = await runReadTool(async () => {
        throw new Error("Tournament not found");
      });

      expect(result.isError).toBe(true);
      expect(textContent(result)).toBe("Tournament not found");
    });
  });
});
