import { PLAYER_AWARD_TYPES, type PlayerAwardType } from "@sarpbc/types";
import { describe, expect, it, vi } from "vitest";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { PlayerAwardService } from "./player-award.service";
import type { AwardTransaction, AwardWriter } from "./ports";
import { mapSequentially } from "../../common/application/sequentially";

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
        participant: onTeam ? { id: "part-kc", name: "Karmine Corp", playerIds: ["zen"] } : null,
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

  const transaction: AwardTransaction = { run: async (work) => await work({ awards: writer }) };
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
    await expect(
      service.requireProposable("cup", "kc", "zen", "defensive_mvp"),
    ).resolves.toBeUndefined();
    expect(writer.create).toHaveBeenCalledOnce();
  });

  it("holds every award type on one stage, including a separate Grand Finals MVP", async () => {
    const { service, writer } = setup();

    await mapSequentially(
      PLAYER_AWARD_TYPES,
      async (awardType) => await service.createForTeam("cup", "kc", "zen", awardType),
    );

    expect(writer.create.mock.calls.map(([input]) => input.awardType)).toEqual([
      "mvp",
      "grand_finals_mvp",
      "offensive_mvp",
      "defensive_mvp",
      "breakthrough_player",
    ]);
    await expect(service.createForTeam("cup", "kc", "zen", "grand_finals_mvp")).rejects.toThrow(
      "Fake Cup already has a grand finals mvp award",
    );
  });

  it("refuses start.gg tournaments for the new award types too", async () => {
    const { service, writer } = setup("startgg");

    await expect(service.createForTeam("cup", "kc", "zen", "grand_finals_mvp")).rejects.toThrow(
      "Awards of start.gg tournaments cannot be proposed",
    );
    await expect(
      service.requireProposable("cup", "kc", "zen", "breakthrough_player"),
    ).rejects.toThrow("Awards of start.gg tournaments cannot be proposed");
    expect(writer.create).not.toHaveBeenCalled();
  });
});
