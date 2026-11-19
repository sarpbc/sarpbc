import { EventEmitter2, EventEmitterModule } from "@nestjs/event-emitter";
import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";
import { MATCH_DECIDED, matchDecided } from "../../../tournament/domain/match-decided";
import { PickemService } from "../application/pickem.service";
import { MatchDecidedListener } from "./match-decided.listener";

describe(MatchDecidedListener, () => {
  it("scores a match when the decided event is emitted on the application bus", async () => {
    const scored: string[] = [];

    const pickem: Pick<PickemService, "autoScoreMatch"> = {
      autoScoreMatch: async (matchId) => {
        scored.push(matchId);
      },
    };

    const module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [MatchDecidedListener, { provide: PickemService, useValue: pickem }],
    }).compile();

    await module.init();

    await module.get(EventEmitter2).emitAsync(MATCH_DECIDED, matchDecided("match"));

    expect(scored).toStrictEqual(["match"]);
    await module.close();
  });
});
