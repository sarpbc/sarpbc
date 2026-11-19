import type { PlayerAwardType } from "@sarpbc/types";
import { describe, expect, it } from "vitest";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { PlayerAwardService } from "./player-award.service";
import type { AwardTransaction } from "./ports";

const setup = (source: "manual" | "startgg" = "manual") => {
  const given = new Set<PlayerAwardType>();

  const created: {
    awardType: PlayerAwardType;
    participantId: string;
    playerId: string;
    tournamentId: string;
  }[] = [];

  const writer = {
    awardTaken: async (_: string, awardType: PlayerAwardType) => given.has(awardType),
    context: async (
      tournamentId: string,
      participant: { participantId: string } | { teamId: string },
      playerId: string,
    ) => {
      const onTeam =
        "teamId" in participant
          ? participant.teamId === "kc"
          : participant.participantId === "part-kc";

      return {
        participant: onTeam ? { id: "part-kc", name: "Karmine Corp", playerIds: ["zen"] } : null,
        player: playerId === "nobody" ? null : { id: playerId, name: playerId, slug: playerId },
        tournament: tournamentId === "cup" ? { id: "cup", name: "Fake Cup", source } : null,
      };
    },
    create: async (input: {
      tournamentId: string;
      participantId: string;
      playerId: string;
      awardType: PlayerAwardType;
    }) => {
      given.add(input.awardType);
      created.push(input);

      return {
        awardType: input.awardType,
        id: "award-1",
        participant: { id: input.participantId },
        player: { id: input.playerId, name: input.playerId, slug: input.playerId },
      };
    },
    remove: async () => false,
  };

  const transaction: AwardTransaction = { run: async (work) => await work({ awards: writer }) };

  const service = new PlayerAwardService(
    { byPlayer: async () => null, byTournament: async () => null },
    transaction,
  );

  return { created, service };
};

describe("PlayerAwardService by team", () => {
  it("resolves the participant from the team and creates the award", async () => {
    const { created, service } = setup();

    await expect(service.createForTeam("cup", "kc", "zen", "mvp")).resolves.toMatchObject({
      id: "award-1",
    });

    expect(created).toStrictEqual([
      { awardType: "mvp", participantId: "part-kc", playerId: "zen", tournamentId: "cup" },
    ]);
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
    const { created, service } = setup();
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
    expect(created).toHaveLength(1);
  });

  it("refuses to create an award on a start.gg tournament", async () => {
    const { created, service } = setup("startgg");

    await expect(service.createForTeam("cup", "kc", "zen", "grand_finals_mvp")).rejects.toThrow(
      "Awards of start.gg tournaments cannot be proposed",
    );
    expect(created).toStrictEqual([]);
  });
});
