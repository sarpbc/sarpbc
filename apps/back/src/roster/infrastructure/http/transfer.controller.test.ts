import { beforeEach, describe, expect, it, vi } from "vitest";
import { Contract, ContractRole, Player, Team } from "../../domain/roster";
import { TransferController } from "./transfer.controller";

describe("TransferController", () => {
  const kc = Object.assign(new Team(), {
    id: "kc",
    name: "Karmine Corp",
    slug: "karmine-corp",
    imageUrl: "https://cdn/kc.png",
  });
  const zen = Object.assign(new Player(), { id: "zen", name: "zen", slug: "zen", team: kc });
  const contract = Object.assign(new Contract(), {
    id: "c1",
    player: zen,
    team: kc,
    startDate: new Date("2025-06-01"),
    role: ContractRole.ACTIVE,
    joinSourceUrl: "https://x.com/KarmineCorp/status/1",
  });
  const transfers = { findAndCount: vi.fn() };
  const teams = { findBySlug: vi.fn() };
  const players = { findBySlug: vi.fn() };
  const controller = new TransferController(transfers as never, teams as never, players as never);
  const page = { limit: 5, offset: 0 };

  beforeEach(() => {
    vi.resetAllMocks();
    teams.findBySlug.mockResolvedValue(kc);
    players.findBySlug.mockResolvedValue(zen);
    transfers.findAndCount.mockResolvedValue([
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
    await expect(controller.find(page)).resolves.toEqual({
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
          },
        },
      ],
      count: 1,
    });
    expect(transfers.findAndCount).toHaveBeenCalledWith({
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

    expect(teams.findBySlug).toHaveBeenCalledWith("old-kc-slug");
    expect(transfers.findAndCount).toHaveBeenCalledWith({
      ...page,
      teamId: "kc",
      playerId: "zen",
      type: "benched",
      from: new Date("2025-01-01"),
      to: new Date("2025-12-31"),
    });
  });

  it("returns an empty page for an unknown team or player", async () => {
    teams.findBySlug.mockResolvedValue(null);

    await expect(controller.find({ ...page, team: "missing" })).resolves.toEqual({
      transfers: [],
      count: 0,
    });
    expect(transfers.findAndCount).not.toHaveBeenCalled();
  });
});
