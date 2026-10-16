import { ValidationPipe } from "@nestjs/common";
import { GuessDto } from "./guess.dto";

describe("AirRiddle guess input", () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
  const metadata = { type: "body", metatype: GuessDto } as const;

  it("accepts a player name and an optional final-guess boolean", async () => {
    await expect(pipe.transform({ guess: "Kaydop" }, metadata)).resolves.toEqual({
      guess: "Kaydop",
    });
    await expect(pipe.transform({ guess: "Kaydop", last: true }, metadata)).resolves.toEqual({
      guess: "Kaydop",
      last: true,
    });
  });

  it.each([
    {},
    { guess: "" },
    { guess: 42 },
    { guess: "Kaydop", last: "true" },
    { guess: "Kaydop", answer: "Zen" },
  ])("rejects malformed input %j", async (input) => {
    await expect(pipe.transform(input, metadata)).rejects.toThrow();
  });
});
