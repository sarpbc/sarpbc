import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { UserService } from "src/user/user.service";
import { requirePermission, runPermissionGatedTool, runReadTool } from "./permission-gate";

function textContent(result: CallToolResult): string {
  const block = result.content[0];
  if (block?.type === "text") {
    return block.text;
  }
  return "";
}

describe("permission-gate", () => {
  const userService = {
    hasAnyPermission: jest.fn(),
  } as unknown as UserService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("requirePermission", () => {
    it("returns null when the user has the permission", async () => {
      (userService.hasAnyPermission as jest.Mock).mockResolvedValue(true);

      const result = await requirePermission(userService, "user-1", "news.manage");

      expect(result).toBeNull();
      expect(userService.hasAnyPermission).toHaveBeenCalledWith("user-1", ["news.manage"]);
    });

    it("returns a denial message when the user lacks the permission", async () => {
      (userService.hasAnyPermission as jest.Mock).mockResolvedValue(false);

      const result = await requirePermission(userService, "user-1", "news.manage");

      expect(result).toBe(
        "You need the news.manage permission. Ask an admin to update your staff role.",
      );
    });
  });

  describe("runPermissionGatedTool", () => {
    it("returns isError when permission is denied", async () => {
      (userService.hasAnyPermission as jest.Mock).mockResolvedValue(false);

      const result = await runPermissionGatedTool(
        userService,
        "user-1",
        "tournaments.manage",
        async () => ({ ok: true }),
      );

      expect(result.isError).toBe(true);
      expect(textContent(result)).toContain("tournaments.manage");
    });

    it("returns JSON content when allowed and handler succeeds", async () => {
      (userService.hasAnyPermission as jest.Mock).mockResolvedValue(true);

      const result = await runPermissionGatedTool(
        userService,
        "user-1",
        "tournaments.manage",
        async () => ({ matchId: "match-1" }),
      );

      expect(result.isError).toBeUndefined();
      expect(textContent(result)).toContain("match-1");
    });

    it("returns isError when the handler throws", async () => {
      (userService.hasAnyPermission as jest.Mock).mockResolvedValue(true);

      const result = await runPermissionGatedTool(
        userService,
        "user-1",
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
