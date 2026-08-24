import { BadRequestException } from "@nestjs/common";
import { requireNewsUpdateFields } from "./write-tools";

describe("requireNewsUpdateFields", () => {
  it("rejects when no field is provided", () => {
    expect(() => requireNewsUpdateFields({})).toThrow(BadRequestException);
  });

  it("accepts a single optional field", () => {
    expect(() => requireNewsUpdateFields({ title: "Zen joins Karmine Corp" })).not.toThrow();
  });

  it("accepts a null clear for French or image fields", () => {
    expect(() => requireNewsUpdateFields({ titleFr: null, imageUrl: null })).not.toThrow();
  });
});
