import { describe, expect, it, vi } from "vitest";
import { MATCH_DECIDED } from "../../../tournament/application/public";
import { PickemService } from "../application/pickem.service";
import { MatchDecidedListener } from "./match-decided.listener";

describe("MatchDecidedListener", () => {
  it("scores the decided match", async () => {
    const pickem: PickemService = Object.create(PickemService.prototype);
    const autoScoreMatch = vi.spyOn(pickem, "autoScoreMatch").mockResolvedValue(undefined);
    await new MatchDecidedListener(pickem).handle({ type: MATCH_DECIDED, matchId: "match" });
    expect(autoScoreMatch).toHaveBeenCalledWith("match");
  });
});
