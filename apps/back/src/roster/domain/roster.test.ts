import { CONTRACT_ROLES } from "@sarpbc/types";
import { describe, expect, it } from "vitest";
import { InvalidInputError } from "../../common/domain/errors";
import { Contract, ContractRole, Player, Team } from "./roster";

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
      slug: "local-player",
      imageUrl: "local.png",
      team,
      role: "Coach",
    });
    player.synchronizeProfile({ pandascoreId: 42, name: "New name", imageUrl: "remote.png" });
    expect(player.slug).toBe("local-player");
    expect(player.imageUrl).toBe("local.png");
    expect(player.team).toBe(team);
    expect(player.role).toBe("Coach");
    player.synchronizeProfile({ pandascoreId: 42, name: "New name", role: null });
    expect(player.role).toBeNull();
  });

  it("keeps team artwork and local identity while refreshing imported metadata", () => {
    const team = Object.assign(new Team(), {
      slug: "local-team",
      imageUrl: "local.png",
      darkModeImageUrl: "dark-local.png",
    });
    team.synchronizeProfile({
      pandascoreId: 4,
      name: "Updated name",
      imageUrl: "remote.png",
      darkModeImageUrl: "remote-dark.png",
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
    expect(contract.endDate).toEqual(new Date("2026-10-23"));
    expect(contract.leaveSourceUrl).toBe("https://x.com/team/status/1");
  });

  it("rejects a departure before the contract start", () => {
    const contract = Object.assign(new Contract(), { startDate: new Date("2026-10-23") });
    expect(() => contract.close(new Date("2026-01-10"), "https://x.com/a")).toThrow(
      InvalidInputError,
    );
    expect(contract.endDate).toBeNull();
  });
});

describe("current role", () => {
  const team = Object.assign(new Team(), { id: "kc" });

  it("comes from the current contract over the imported profile role", () => {
    const player = Object.assign(new Player(), {
      team,
      role: "Coach",
      contractRole: ContractRole.BENCHED,
    });
    expect(player.currentRole()).toBe(ContractRole.BENCHED);
    player.contractRole = ContractRole.ANALYST;
    expect(player.currentRole()).toBe(ContractRole.ANALYST);
  });

  it("keeps contract roles aligned with the shared role list", () => {
    expect(Object.values(ContractRole)).toEqual([...CONTRACT_ROLES]);
  });

  it("falls back to the imported staff role when the current team has no contract", () => {
    const role = (pandascoreRole: string | null) =>
      Object.assign(new Player(), { team, role: pandascoreRole }).currentRole();
    expect(role("Coach")).toBe(ContractRole.COACH);
    expect(role("Assistant Coach")).toBe(ContractRole.ASSISTANT_COACH);
    expect(role(" head-coach ")).toBe(ContractRole.COACH);
    expect(role("Co-Coach")).toBe(ContractRole.ASSISTANT_COACH);
    expect(role("Analyst")).toBe(ContractRole.ANALYST);
    expect(role("Manager")).toBe(ContractRole.MANAGER);
    expect(role("Staff")).toBe(ContractRole.MANAGER);
    expect(role("Substitute")).toBe(ContractRole.ACTIVE);
    expect(role(null)).toBe(ContractRole.ACTIVE);
  });

  it("normalizes a long separator run from an imported role in linear time", () => {
    const payload = `head${" -".repeat(50_000)}\tcoach${" ".repeat(50_000)}!`;
    const player = Object.assign(new Player(), { team, role: payload });
    const started = performance.now();
    expect(player.currentRole()).toBe(ContractRole.ACTIVE);
    expect(performance.now() - started).toBeLessThan(100);
  });

  it("is empty without a current team", () => {
    const player = Object.assign(new Player(), { role: "Coach", contractRole: null });
    expect(player.currentRole()).toBeNull();
  });
});
