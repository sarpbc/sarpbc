import { canonicalImageContentType } from "./file.util";

describe("canonicalImageContentType", () => {
  it("maps jpeg aliases used by browsers", () => {
    expect(canonicalImageContentType("image/jpg")).toBe("image/jpeg");
    expect(canonicalImageContentType("image/pjpeg")).toBe("image/jpeg");
    expect(canonicalImageContentType("IMAGE/JPG")).toBe("image/jpeg");
  });

  it("keeps supported types and strips parameters", () => {
    expect(canonicalImageContentType("image/jpeg")).toBe("image/jpeg");
    expect(canonicalImageContentType("image/png; charset=binary")).toBe("image/png");
  });
});
