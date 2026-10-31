import { afterEach, describe, expect, it, vi } from "vitest";
import { createTwitchSource } from "./create-twitch-source";
import { TwitchHelixSource } from "./twitch-helix-source";

describe("createTwitchSource", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("disables the feature without any Twitch call when credentials are missing", () => {
    const fetch = vi.spyOn(global, "fetch");

    expect(createTwitchSource(undefined, undefined)).toBeNull();
    expect(createTwitchSource("client", undefined)).toBeNull();
    expect(createTwitchSource(undefined, "secret")).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("creates a Helix source when both credentials are present", () => {
    expect(createTwitchSource("client", "secret")).toBeInstanceOf(TwitchHelixSource);
  });
});
