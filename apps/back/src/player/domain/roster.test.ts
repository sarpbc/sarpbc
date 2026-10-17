import { describe, expect, it } from "vitest";
import { Player, Team } from "./roster";

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
