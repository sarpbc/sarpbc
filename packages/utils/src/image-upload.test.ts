import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canonicalImageContentType } from "./image-upload";

void describe("canonicalImageContentType", () => {
  void it("maps jpeg aliases used by browsers", () => {
    assert.equal(canonicalImageContentType("image/jpg"), "image/jpeg");
    assert.equal(canonicalImageContentType("image/pjpeg"), "image/jpeg");
    assert.equal(canonicalImageContentType("IMAGE/JPG"), "image/jpeg");
  });

  void it("keeps supported types and strips parameters", () => {
    assert.equal(canonicalImageContentType("image/jpeg"), "image/jpeg");
    assert.equal(canonicalImageContentType("image/png; charset=binary"), "image/png");
  });
});
