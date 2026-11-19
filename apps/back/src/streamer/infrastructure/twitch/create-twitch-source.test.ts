import { describe, expect, it } from "vitest";
import { createTwitchSource } from "./create-twitch-source";
import { TwitchHelixSource } from "./twitch-helix-source";

describe(createTwitchSource, () => {
  it("disables the feature when a credential is missing", () => {
    expect(createTwitchSource(undefined, undefined)).toBeNull();
    expect(createTwitchSource("client", undefined)).toBeNull();
    expect(createTwitchSource(undefined, "secret")).toBeNull();
  });

  it("creates a Helix source when both credentials are present", () => {
    expect(createTwitchSource("client", "secret")).toBeInstanceOf(TwitchHelixSource);
  });
});
