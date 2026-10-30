import { describe, expect, it } from "vitest";
import { resolveApiBase, shouldSendInternalApiToken } from "@sarpbc/utils";

const PUBLIC = "https://api.sarpbc.org";
const SERVER = "http://sarpbcorg-back-lc37mk:4001";

describe("server API origin", () => {
  it("keeps the public origin on the client and when no server base is set", () => {
    expect(resolveApiBase(PUBLIC, undefined, false)).toBe(PUBLIC);
    expect(resolveApiBase(PUBLIC, SERVER, false)).toBe(PUBLIC);
    expect(resolveApiBase(`${PUBLIC}/`, "  ", true)).toBe(PUBLIC);
    expect(resolveApiBase(PUBLIC, undefined, true)).toBe(PUBLIC);
  });

  it("uses the private origin for server calls and drops a trailing slash", () => {
    expect(resolveApiBase(PUBLIC, `${SERVER}/`, true)).toBe(SERVER);
  });

  it("attaches the internal token only to the private origin", () => {
    expect(shouldSendInternalApiToken(`${SERVER}/matches/upcoming`, undefined, SERVER)).toBe(true);
    expect(shouldSendInternalApiToken("/matches/upcoming", SERVER, SERVER)).toBe(true);
    expect(shouldSendInternalApiToken(`${PUBLIC}/matches/upcoming`, SERVER, SERVER)).toBe(false);
    expect(shouldSendInternalApiToken("/matches/upcoming", undefined, SERVER)).toBe(false);
    expect(shouldSendInternalApiToken(`${SERVER}/matches`, undefined, undefined)).toBe(false);
    expect(
      shouldSendInternalApiToken("https://api.sarpbc.org.evil/matches", undefined, SERVER),
    ).toBe(false);
  });
});
