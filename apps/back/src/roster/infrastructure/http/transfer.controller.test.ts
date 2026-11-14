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
          contract,
          date: contract.startDate,
          id: "c1:join",
          sourceUrl: contract.joinSourceUrl,
          type: "arrival",
        },
      ],
      1,
    ]);
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
    expect(findAndCount).toHaveBeenCalledWith({
      ...page,
      from: undefined,
      playerId: undefined,
      teamId: undefined,
      to: undefined,
      type: undefined,
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

    expect(teamBySlug).toHaveBeenCalledWith("old-kc-slug");
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
    teamBySlug.mockResolvedValue(null);

    await expect(controller.find({ ...page, team: "missing" })).resolves.toStrictEqual({
      count: 0,
      transfers: [],
    });
    expect(findAndCount).not.toHaveBeenCalled();
  });
});
