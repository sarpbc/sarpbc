import { describe, expect, it } from "vitest";
import { parseEntityRef } from "./entity-ref";

describe("parseEntityRef", () => {
  it("reads a positive integer as a public id", () => {
    expect(parseEntityRef("7250")).toEqual({ kind: "publicId", value: 7250 });
  });

  it("reads a UUID as the legacy id and lowercases it", () => {
    const id = "0A1B2C3D-0000-4000-8000-123456789ABC";
    expect(parseEntityRef(id)).toEqual({ kind: "id", value: id.toLowerCase() });
  });

  it.each(["0", "-5", "007", "12.5", "1e3", "abc", "", " 42", "match-1", "2147483648"])(
    "rejects %j",
    (raw) => {
      expect(parseEntityRef(raw)).toBeNull();
    },
  );

  it("accepts the largest integer a Postgres int column holds", () => {
    expect(parseEntityRef("2147483647")).toEqual({ kind: "publicId", value: 2147483647 });
  });
});
