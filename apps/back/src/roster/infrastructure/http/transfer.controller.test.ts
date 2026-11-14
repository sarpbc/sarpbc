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
    name: "Karmine Corp",
    slug: "karmine-corp",
    imageUrl: "https://cdn/kc.png",
    logoDarkUrl: "https://cdn.sarpbc.test/teams/kc/logo-dark-abc.webp",
  });

  const zen = Object.assign(new Player(), { id: "zen", name: "zen", slug: "zen", team: kc });

  const contract = Object.assign(new Contract(), {
    id: "c1",
    player: zen,
    team: kc,
    startDate: new Date("2025-06-01"),
    role: "active",
    joinSourceUrl: "https://x.com/KarmineCorp/status/1",
  });

  const findAndCount = vi.fn<TransferService["findAndCount"]>();
  const teamBySlug = vi.fn<TeamService["findBySlug"]>();
  const playerBySlug = vi.fn<PlayerService["findBySlug"]>();

  const controller = new TransferController(
    Object.assign(unconstructed(TransferService), { findAndCount }),
    Object.assign(unconstructed(TeamService), { findBySlug: teamBySlug }),
    Object.assign(unconstructed(PlayerService), { findBySlug: playerBySlug }),
  );

  const page = { limit: 5, offset: 0 };

  beforeEach(() => {
    vi.resetAllMocks();
    teamBySlug.mockResolvedValue(kc);
    playerBySlug.mockResolvedValue(zen);
    findAndCount.mockResolvedValue([
      [
        {
          id: "c1:join",
          type: "arrival",
          date: contract.startDate,
          contract,
          sourceUrl: contract.joinSourceUrl,
        },
      ],
      1,
    ]);
  });

  it("presents transfers with their player, team and calendar day", async () => {
    await expect(controller.find(page)).resolves.toStrictEqual({
      transfers: [
        {
          id: "c1:join",
          type: "arrival",
          date: "2025-06-01",
          role: "active",
          sourceUrl: "https://x.com/KarmineCorp/status/1",
          player: { id: "zen", name: "zen", slug: "zen", imageUrl: null, nationality: null },
          team: {
            id: "kc",
            name: "Karmine Corp",
            slug: "karmine-corp",
            imageUrl: "https://cdn/kc.png",
            darkModeImageUrl: null,
            logoLightUrl: null,
            logoDarkUrl: "https://cdn.sarpbc.test/teams/kc/logo-dark-abc.webp",
          },
        },
      ],
      count: 1,
    });
    expect(findAndCount).toHaveBeenCalledWith({
      ...page,
      teamId: undefined,
      playerId: undefined,
      type: undefined,
      from: undefined,
      to: undefined,
    });
  });

  it("resolves team and player slugs and forwards the filters", async () => {
    await controller.find({
      ...page,
      team: "old-kc-slug",
      player: "zen",
      type: "benched",
      from: "2025-01-01",
      to: "2025-12-31",
    });

    expect(teamBySlug).toHaveBeenCalledWith("old-kc-slug");
    expect(findAndCount).toHaveBeenCalledWith({
      ...page,
      teamId: "kc",
      playerId: "zen",
      type: "benched",
      from: new Date("2025-01-01"),
      to: new Date("2025-12-31"),
    });
  });

  it("returns an empty page for an unknown team or player", async () => {
    teamBySlug.mockResolvedValue(null);

    await expect(controller.find({ ...page, team: "missing" })).resolves.toStrictEqual({
      transfers: [],
      count: 0,
    });
    expect(findAndCount).not.toHaveBeenCalled();
  });
});
