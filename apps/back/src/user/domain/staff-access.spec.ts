import {
  isStaffRole,
  permissionsForRole,
  roleHasPermission,
  ROLE_PERMISSIONS,
  STAFF_PERMISSIONS,
} from "./staff-access";

describe("staff-access", () => {
  it("defines permissions for every role", () => {
    expect(ROLE_PERMISSIONS.admin).toEqual(STAFF_PERMISSIONS);
    expect(ROLE_PERMISSIONS.journalist).toEqual(["news.manage", "images.manage"]);
    expect(ROLE_PERMISSIONS.moderator).toEqual(["forum.moderate"]);
  });

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
    expect(permissionsForRole(null)).toEqual([]);
  });
});
