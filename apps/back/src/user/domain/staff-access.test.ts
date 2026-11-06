import { STAFF_PERMISSIONS } from "@sarpbc/types";
import { describe, expect, it } from "vitest";
import { isStaffRole, permissionsForRole, roleHasPermission } from "./staff-access";

describe("staff-access", () => {
  it("recognizes staff roles only", () => {
    expect(isStaffRole("admin")).toBe(true);
    expect(isStaffRole("moderator")).toBe(true);
    expect(isStaffRole("journalist")).toBe(true);
    expect(isStaffRole(null)).toBe(false);
    expect(isStaffRole("member")).toBe(false);
  });

  it("grants admin all permissions", () => {
    for (const permission of STAFF_PERMISSIONS) {
      expect(roleHasPermission("admin", permission)).toBe(true);
    }
  });

  it("limits journalist and moderator to their bundles", () => {
    expect(roleHasPermission("journalist", "news.manage")).toBe(true);
    expect(roleHasPermission("journalist", "forum.moderate")).toBe(false);
    expect(roleHasPermission("moderator", "forum.moderate")).toBe(true);
    expect(roleHasPermission("moderator", "players.manage")).toBe(false);
    expect(roleHasPermission("journalist", "users.manage")).toBe(false);
    expect(roleHasPermission("moderator", "users.manage")).toBe(false);
    expect(permissionsForRole(null)).toEqual([]);
  });
});
