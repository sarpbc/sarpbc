import { beforeEach, describe, expect, it, vi } from "vitest";
import { Contract } from "../../domain/contract";
import { Player } from "../../domain/player";
import { Team } from "../../domain/team";
import { TransferController } from "./transfer.controller";
import { TransferService } from "../../application/transfer.service";
import { TeamService } from "../../application/team.service";
import { PlayerService } from "../../application/player.service";
import { unconstructed } from "../../../../test/doubles";

describe(TransferController, () => {
  const kc = Object.assign(new Team(), {
    id: "kc",
    imageUrl: "https://cdn/kc.png",
    logoDarkUrl: "https://cdn.sarpbc.test/teams/kc/logo-dark-abc.webp",
    name: "Karmine Corp",
    slug: "karmine-corp",
  });

  const zen = Object.assign(new Player(), { id: "zen", name: "zen", slug: "zen", team: kc });

  const contract = Object.assign(new Contract(), {
    id: "c1",
    joinSourceUrl: "https://x.com/KarmineCorp/status/1",
    player: zen,
    role: "active",
    startDate: new Date("2025-06-01"),
    team: kc,
  });

  const transfers: Pick<TransferService, "findAndCount"> = {
    findAndCount: async () => [
      [
        {
          contract,
          date: contract.startDate,
          id: "c1:join",
          sourceUrl: contract.joinSourceUrl,
          type: "arrival",
        },
      ],
      1,
    ],
  };

  const teamQueries: Pick<TeamService, "findBySlug"> = {
    findBySlug: async (slug) => (slug === "old-kc-slug" ? kc : null),
  };

  const playerQueries: Pick<PlayerService, "findBySlug"> = {
    findBySlug: async (slug) => (slug === "zen" ? zen : null),
  };

  const findAndCount = vi.spyOn(transfers, "findAndCount");

  const controller = new TransferController(
    Object.assign(unconstructed(TransferService), transfers),
    Object.assign(unconstructed(TeamService), teamQueries),
    Object.assign(unconstructed(PlayerService), playerQueries),
  );

  const page = { limit: 5, offset: 0 };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("presents transfers with their player, team and calendar day", async () => {
    await expect(controller.find(page)).resolves.toStrictEqual({
      count: 1,
      transfers: [
        {
          date: "2025-06-01",
          id: "c1:join",
          player: { id: "zen", imageUrl: null, name: "zen", nationality: null, slug: "zen" },
          role: "active",
          sourceUrl: "https://x.com/KarmineCorp/status/1",
          team: {
            darkModeImageUrl: null,
            id: "kc",
            imageUrl: "https://cdn/kc.png",
            logoDarkUrl: "https://cdn.sarpbc.test/teams/kc/logo-dark-abc.webp",
            logoLightUrl: null,
            name: "Karmine Corp",
            slug: "karmine-corp",
          },
          type: "arrival",
        },
      ],
    });
  });

  it("resolves team and player slugs and forwards the filters", async () => {
    await controller.find({
      ...page,
      from: "2025-01-01",
      player: "zen",
      team: "old-kc-slug",
      to: "2025-12-31",
      type: "benched",
    });

    expect(findAndCount).toHaveBeenCalledWith({
      ...page,
      from: new Date("2025-01-01"),
      playerId: "zen",
      teamId: "kc",
      to: new Date("2025-12-31"),
      type: "benched",
    });
  });

  it("returns an empty page for an unknown team or player", async () => {
    await expect(controller.find({ ...page, team: "missing" })).resolves.toStrictEqual({
      count: 0,
      transfers: [],
    });
    await expect(controller.find({ ...page, player: "missing" })).resolves.toStrictEqual({
      count: 0,
      transfers: [],
    });
    expect(findAndCount).not.toHaveBeenCalled();
  });
});
