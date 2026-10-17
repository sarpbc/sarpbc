import { describe, expect, it } from "vitest";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { R2UploadDto } from "./r2-upload-url.dto";

describe("R2UploadDto", () => {
  it.each(["news", "tournament"])("accepts the %s upload destination", async (target) => {
    expect(await validate(plainToInstance(R2UploadDto, { target }))).toEqual([]);
  });

  it.each([undefined, "../../private", "other"])(
    "rejects an invalid upload destination: %p",
    async (target) => {
      const errors = await validate(plainToInstance(R2UploadDto, { target }));
      expect(errors.map((error) => error.property)).toContain("target");
    },
  );
});
