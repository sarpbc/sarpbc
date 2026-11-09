import type { PlayerAwardType } from "@sarpbc/types";
import { describe, expect, it, vi } from "vitest";
import { InvalidInputError, NotFoundError } from "../../common/domain/errors";
import { PlayerAwardService } from "./player-award.service";
import type { AwardTransaction, AwardWriter } from "./ports";

function setup(source: "manual" | "startgg" = "manual") {
  const given = new Set<PlayerAwardType>();
  const writer = {
    context: vi.fn<AwardWriter["context"]>(async (tournamentId, participant, playerId) => {
      const onTeam =
        "teamId" in participant
          ? participant.teamId === "kc"
          : participant.participantId === "part-kc";
      return {
        tournament: tournamentId === "cup" ? { id: "cup", name: "Fake Cup", source } : null,
        participant: onTeam
          ? { id: "part-kc", team: { id: "kc", name: "Karmine Corp" }, playerIds: ["zen"] }
          : null,
        player: playerId === "nobody" ? null : { id: playerId, name: playerId, slug: playerId },
      };
    }),
    awardTaken: vi.fn<AwardWriter["awardTaken"]>(async (_, awardType) => given.has(awardType)),
    create: vi.fn<AwardWriter["create"]>(async (input) => {
      given.add(input.awardType);
      return {
        id: "award-1",
        awardType: input.awardType,
        player: { id: input.playerId, name: input.playerId, slug: input.playerId },
        participant: { id: input.participantId },
      };
    }),
    remove: vi.fn<AwardWriter["remove"]>(),
  } satisfies AwardWriter;
  const transaction: AwardTransaction = { run: (work) => work({ awards: writer }) };
  const service = new PlayerAwardService({ byPlayer: vi.fn(), byTournament: vi.fn() }, transaction);
  return { service, writer };
}

describe("PlayerAwardService by team", () => {
  it("resolves the participant from the team and creates the award", async () => {
    const { service, writer } = setup();

    await expect(service.createForTeam("cup", "kc", "zen", "mvp")).resolves.toMatchObject({
      id: "award-1",
    });

    expect(writer.create).toHaveBeenCalledWith({
      tournamentId: "cup",
      participantId: "part-kc",
      playerId: "zen",
      awardType: "mvp",
    });
  });

  it("refuses an unknown tournament, a team outside the tournament and a player off its roster", async () => {
    const { service } = setup();

    await expect(service.requireProposable("nope", "kc", "zen", "mvp")).rejects.toThrow(
      NotFoundError,
    );
    await expect(service.requireProposable("cup", "other", "zen", "mvp")).rejects.toThrow(
      NotFoundError,
    );
    await expect(service.requireProposable("cup", "kc", "nobody", "mvp")).rejects.toThrow(
      NotFoundError,
    );
    await expect(service.requireProposable("cup", "kc", "bench", "mvp")).rejects.toThrow(
      InvalidInputError,
    );
  });

  it("refuses start.gg tournaments", async () => {
    const { service } = setup("startgg");

    await expect(service.requireProposable("cup", "kc", "zen", "mvp")).rejects.toThrow(
      "Awards of start.gg tournaments cannot be proposed",
    );
  });

  it("refuses a second award of the same type, whoever receives it", async () => {
    const { service, writer } = setup();
    await service.createForTeam("cup", "kc", "zen", "mvp");

    await expect(service.requireProposable("cup", "kc", "zen", "mvp")).rejects.toThrow(
      InvalidInputError,
    );
    await expect(service.createForTeam("cup", "kc", "zen", "mvp")).rejects.toThrow(
      "Fake Cup already has a mvp award",
    );
    await expect(service.requireProposable("cup", "kc", "zen", "defensive_mvp")).resolves.toBe(
      undefined,
    );
    expect(writer.create).toHaveBeenCalledTimes(1);
  });
});
