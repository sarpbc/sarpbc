import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveApiBase } from "./internal-api.ts";

const PUBLIC = "https://api.sarpbc.org";
const SERVER = "http://sarpbcorg-back-lc37mk:4001";

describe("resolveApiBase", () => {
  it("keeps the public origin on the client and when no server base is set", () => {
    assert.equal(resolveApiBase(PUBLIC, undefined, false), PUBLIC);
    assert.equal(resolveApiBase(PUBLIC, SERVER, false), PUBLIC);
    assert.equal(resolveApiBase(`${PUBLIC}/`, "  ", true), PUBLIC);
    assert.equal(resolveApiBase(PUBLIC, undefined, true), PUBLIC);
  });

  it("uses the private origin for server calls and drops a trailing slash", () => {
    assert.equal(resolveApiBase(PUBLIC, `${SERVER}/`, true), SERVER);
  });
});
