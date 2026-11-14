import { describe, expect, it } from "vitest";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { assertValidMatchBlocks } from "./news-content.util";

describe("assertValidMatchBlocks", () => {
  it("accepts well-formed match blocks", () => {
    expect(() => {
      assertValidMatchBlocks(
        [
          ':matches{match="0b8e7c62-4d0f-4c47-9a57-0e6a5c3d9f11"}',
          ':matches{ids="0b8e7c62-4d0f-4c47-9a57-0e6a5c3d9f11,6f1d2b0a-93c4-4e8f-b7a2-5c1e8d4f0a22"}',
          '::matches{team="c9e1a3b5-7d9f-4b1d-a3c5-e7f9b1d3f544" limit="10"}\n::',
        ].join("\n\n"),
      );
    }).not.toThrow();
  });

  it("rejects malformed match blocks with the offending tag", () => {
    expect(() => {
      assertValidMatchBlocks(':matches{tournament="rlcs-worlds"}');
    }).toThrow(InvalidInputError);
    expect(() => {
      assertValidMatchBlocks(':matches{tournament="rlcs-worlds"}');
    }).toThrow(':matches{tournament="rlcs-worlds"}');
  });

  it("rejects a match block inside a sentence", () => {
    expect(() => {
      assertValidMatchBlocks('Watch :matches{match="0b8e7c62-4d0f-4c47-9a57-0e6a5c3d9f11"} live.');
    }).toThrow("on its own line");
  });
});
