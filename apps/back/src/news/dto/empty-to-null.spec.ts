import { emptyToNull } from "./empty-to-null";

describe("emptyToNull", () => {
  it("keeps undefined for omitted patch fields", () => {
    expect(emptyToNull(undefined)).toBeUndefined();
  });

  it("turns blank strings into null", () => {
    expect(emptyToNull(null)).toBeNull();
    expect(emptyToNull("  ")).toBeNull();
    expect(emptyToNull("Titre")).toBe("Titre");
  });
});
