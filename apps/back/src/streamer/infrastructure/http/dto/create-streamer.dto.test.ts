import { describe, expect, it } from "vitest";
import { CreateStreamerDto } from "./create-streamer.dto";

describe("create-streamer body", () => {
  it("normalizes the login and a blank display name", () => {
    expect(CreateStreamerDto.parse({ displayName: "  ", login: "  ZenRLL " })).toStrictEqual({
      displayName: null,
      login: "zenrll",
    });
  });

  it("keeps a display name", () => {
    expect(CreateStreamerDto.parse({ displayName: " Kaydop ", login: "kaydop" })).toStrictEqual({
      displayName: "Kaydop",
      login: "kaydop",
    });
  });

  it("accepts a login without a display name", () => {
    expect(CreateStreamerDto.parse({ login: "rocket_league_1" })).toStrictEqual({
      displayName: null,
      login: "rocket_league_1",
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

  it("rejects a display name over 100 characters", () => {
    expect(
      CreateStreamerDto.safeParse({ displayName: "a".repeat(101), login: "zenrll" }).success,
    ).toBe(false);
  });

  it("rejects unknown fields", () => {
    expect(CreateStreamerDto.safeParse({ extra: true, login: "zenrll" }).success).toBe(false);
  });
});
