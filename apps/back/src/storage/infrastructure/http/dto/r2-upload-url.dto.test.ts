import { describe, expect, it } from "vitest";
import { R2UploadDto } from "./r2-upload-url.dto";

describe("R2UploadDto", () => {
  it.each(["news", "tournament"])("accepts the %s upload destination", async (target) => {
    expect(R2UploadDto.parse({ target })).toEqual({ target });
  });

  it.each([undefined, "../../private", "other"])(
    "rejects an invalid upload destination: %p",
    async (target) => {
      expect(R2UploadDto.safeParse({ target }).success).toBe(false);
    },
  );
});
