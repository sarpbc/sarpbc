import { describe, expect, it } from "vitest";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { Contract } from "./contract";
import { Player } from "./player";
import { Team } from "./team";

describe("roster policies", () => {
  it("archives only a different nonempty profile photo", () => {
    const player = Object.assign(new Player(), { imageUrl: "old.png" });
    expect(player.replaceProfilePhoto("old.png")).toBeNull();
    expect(player.replaceProfilePhoto("new.png")).toBe("old.png");
    expect(player.imageUrl).toBe("new.png");
    expect(player.replaceProfilePhoto(null)).toBe("new.png");
    expect(player.imageUrl).toBeNull();
  });

  it("preserves local slugs, artwork and current team during imported profile updates", () => {
    const team = Object.assign(new Team(), { id: "current" });

    const player = Object.assign(new Player(), {
      imageUrl: "local.png",
      role: "Coach",
      slug: "local-player",
      team,
    });

    player.synchronizeProfile({ imageUrl: "remote.png", name: "New name", pandascoreId: 42 });
    expect(player.slug).toBe("local-player");
    expect(player.imageUrl).toBe("local.png");
    expect(player.team).toBe(team);
    expect(player.role).toBe("Coach");
    player.synchronizeProfile({ name: "New name", pandascoreId: 42, role: null });
    expect(player.role).toBeNull();
  });

  it("keeps team artwork and local identity while refreshing imported metadata", () => {
    const team = Object.assign(new Team(), {
      darkModeImageUrl: "dark-local.png",
      imageUrl: "local.png",
      slug: "local-team",
    });

    team.synchronizeProfile({
      darkModeImageUrl: "remote-dark.png",
      imageUrl: "remote.png",
      name: "Updated name",
      pandascoreId: 4,
    });
    expect(team.slug).toBe("local-team");
    expect(team.name).toBe("Updated name");
    expect(team.imageUrl).toBe("local.png");
    expect(team.darkModeImageUrl).toBe("dark-local.png");
  });
});

describe("contracts", () => {
  it("closes a contract with its departure source", () => {
    const contract = Object.assign(new Contract(), { startDate: new Date("2026-01-10") });
    contract.close(new Date("2026-10-23"), "https://x.com/team/status/1");
    expect(contract.endDate).toStrictEqual(new Date("2026-10-23"));
    expect(contract.leaveSourceUrl).toBe("https://x.com/team/status/1");
  });

  it("rejects a departure before the contract start", () => {
    const contract = Object.assign(new Contract(), { startDate: new Date("2026-10-23") });
    expect(() => {
      contract.close(new Date("2026-01-10"), "https://x.com/a");
    }).toThrow(InvalidInputError);
    expect(contract.endDate).toBeNull();
  });
});

describe("current role", () => {
  const team = Object.assign(new Team(), { id: "kc" });

  const role = (pandascoreRole: string | null) =>
    Object.assign(new Player(), { role: pandascoreRole, team }).currentRole();

  it("comes from the current contract over the imported profile role", () => {
    const player = Object.assign(new Player(), {
      contractRole: "benched",
      role: "Coach",
      team,
    });

    expect(player.currentRole()).toBe("benched");
    player.contractRole = "analyst";
    expect(player.currentRole()).toBe("analyst");
  });

  it.each([
    ["Coach", "coach"],
    ["Assistant Coach", "assistant_coach"],
    [" head-coach ", "coach"],
    ["Co-Coach", "assistant_coach"],
    ["Analyst", "analyst"],
    ["Manager", "manager"],
    ["Staff", "manager"],
    ["Substitute", "active"],
    [null, "active"],
  ])(
    "falls back to the imported staff role %p as %p when the current team has no contract",
    (imported, expected) => {
      expect(role(imported)).toBe(expected);
    },
  );

  it("normalizes a long separator run from an imported role", () => {
    const payload = `head${" -".repeat(50_000)}\tcoach${" ".repeat(50_000)}!`;
    const player = Object.assign(new Player(), { role: payload, team });
    expect(player.currentRole()).toBe("active");
  });

  it("is empty without a current team", () => {
    const player = Object.assign(new Player(), { contractRole: null, role: "Coach" });
    expect(player.currentRole()).toBeNull();
  });
});
