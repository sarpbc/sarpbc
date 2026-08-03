import { deriveWinnerParticipantId } from "./derive-match-winner";

describe("deriveWinnerParticipantId", () => {
  it("returns the participant with the higher score", () => {
    expect(
      deriveWinnerParticipantId([
        { participantId: "a", score: 3 },
        { participantId: "b", score: 1 },
      ]),
    ).toBe("a");
  });

  it("returns null on a tie", () => {
    expect(
      deriveWinnerParticipantId([
        { participantId: "a", score: 2 },
        { participantId: "b", score: 2 },
      ]),
    ).toBeNull();
  });

  it("returns null when fewer than two scored participants", () => {
    expect(deriveWinnerParticipantId([{ participantId: "a", score: 3 }])).toBeNull();
    expect(deriveWinnerParticipantId([])).toBeNull();
  });
});
