import { describe, expect, it } from "vitest";
import { CreateStreamerDto } from "./create-streamer.dto";

describe("CreateStreamerDto", () => {
  it("normalizes the login and a blank display name", () => {
    expect(CreateStreamerDto.parse({ login: "  ZenRLL ", displayName: "  " })).toEqual({
      login: "zenrll",
      displayName: null,
    });
  });

  it("keeps a display name", () => {
    expect(CreateStreamerDto.parse({ login: "kaydop", displayName: " Kaydop " })).toEqual({
      login: "kaydop",
      displayName: "Kaydop",
    });
  });

  it("accepts a login without a display name", () => {
    expect(CreateStreamerDto.parse({ login: "rocket_league_1" })).toEqual({
      login: "rocket_league_1",
      displayName: null,
    });
  });

  it.each(["a", "abc", "1v1"])("accepts the short legacy login %j", (login) => {
    expect(CreateStreamerDto.safeParse({ login }).success).toBe(true);
  });

  it.each(["_zenrll", "a".repeat(26), "zen-rll", "zen rll", "https://twitch.tv/zenrll", "zén", ""])(
    "rejects the login %j",
    (login) => {
      expect(CreateStreamerDto.safeParse({ login }).success).toBe(false);
    },
  );

  it("rejects a long adversarial login within the time budget", () => {
    const payload = `${"a_".repeat(50_000)}!`;
    const startedAt = performance.now();

    expect(CreateStreamerDto.safeParse({ login: payload }).success).toBe(false);
    expect(performance.now() - startedAt).toBeLessThan(100);
  });

  it("rejects a display name over 100 characters", () => {
    expect(
      CreateStreamerDto.safeParse({ login: "zenrll", displayName: "a".repeat(101) }).success,
    ).toBe(false);
  });

  it("rejects unknown fields", () => {
    expect(CreateStreamerDto.safeParse({ login: "zenrll", extra: true }).success).toBe(false);
  });
});
