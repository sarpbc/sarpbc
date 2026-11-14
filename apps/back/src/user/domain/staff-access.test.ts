import { STAFF_PERMISSIONS } from "@sarpbc/types";
import { describe, expect, it } from "vitest";
import { isStaffRole, permissionsForRole, roleHasPermission } from "./staff-access";

describe("staff-access", () => {
  it.each(["admin", "moderator", "journalist"])("recognizes %s as a staff role", (role) => {
    expect(isStaffRole(role)).toBe(true);
  });

  it.each([null, "member"])("rejects %s as a staff role", (role) => {
    expect(isStaffRole(role)).toBe(false);
  });

  it("grants admin all permissions", () => {
    for (const permission of STAFF_PERMISSIONS) {
      expect(roleHasPermission("admin", permission)).toBe(true);
    }
  });

  it("limits the journalist to its bundle", () => {
    expect(roleHasPermission("journalist", "news.manage")).toBe(true);
    expect(roleHasPermission("journalist", "forum.moderate")).toBe(false);
    expect(roleHasPermission("journalist", "users.manage")).toBe(false);
  });

  it("limits the moderator to its bundle", () => {
    expect(roleHasPermission("moderator", "forum.moderate")).toBe(true);
    expect(roleHasPermission("moderator", "players.manage")).toBe(false);
    expect(roleHasPermission("moderator", "users.manage")).toBe(false);
  });

  it("grants no permission without a role", () => {
    expect(permissionsForRole(null)).toStrictEqual([]);
  });
});
