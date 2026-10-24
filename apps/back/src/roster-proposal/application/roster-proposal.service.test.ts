import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, InvalidInputError, NotFoundError } from "../../common/domain/errors";
import { Player, PlayerStatus, Team } from "../../player/domain/roster";
import { RosterProposal } from "../domain/roster-proposal";
import type { RosterProposalStore } from "./ports";
import { RosterProposalService } from "./roster-proposal.service";

function setup() {
  const saved = new Map<string, RosterProposal>();
  let sequence = 0;
  const store: RosterProposalStore = {
    findById: async (id) => saved.get(id) ?? null,
    list: async (status) => [...saved.values()].filter((p) => p.status === status),
    save: async (proposal) => {
      proposal.id ||= `proposal-${++sequence}`;
      saved.set(proposal.id, proposal);
    },
  };
  const zen = Object.assign(new Player(), { id: "zen", name: "zen" });
  const kc = Object.assign(new Team(), { id: "kc", name: "Karmine Corp" });
  const players = {
    // A merged duplicate resolves to the player it was merged into.
    findById: vi.fn(async (id: string) => (id === "zen" || id === "zen-dup" ? zen : null)),
    create: vi.fn(async () => Object.assign(new Player(), { id: "new-player" })),
    update: vi.fn(async () => zen),
    joinTeam: vi.fn(async () => ({ player: zen, opened: null, closed: [] })),
    leaveTeam: vi.fn(),
  };
  const teams = {
    findById: vi.fn(async (id: string) => (id === "kc" ? kc : null)),
    create: vi.fn(async () => Object.assign(new Team(), { id: "new-team" })),
    update: vi.fn(),
  };
  const merges = { mergePlayers: vi.fn(), mergeTeams: vi.fn() };
  const staff = { allowed: true };
  const service = new RosterProposalService(
    store,
    { run: (work) => work(store) },
    players,
    teams,
    merges,
    {
      hasAnyPermission: async () => staff.allowed,
      findById: async () => null,
    },
  );
  return { saved, players, staff, service };
}

describe("RosterProposalService", () => {
  const source = "https://x.com/KarmineCorp/status/1";
  let saved: ReturnType<typeof setup>["saved"];
  let players: ReturnType<typeof setup>["players"];
  let staff: ReturnType<typeof setup>["staff"];
  let service: RosterProposalService;

  beforeEach(() => {
    ({ saved, players, staff, service } = setup());
  });

  const addZen = () =>
    service.propose(
      { kind: "add_player_to_team", playerId: "zen", teamId: "kc", effectiveDate: "2026-10-24" },
      source,
      "journalist",
    );

  it("records a pending proposal without touching the roster", async () => {
    const proposal = await addZen();

    expect(proposal).toMatchObject({ status: "pending", sourceUrl: source });
    expect(players.joinTeam).not.toHaveBeenCalled();
  });

  it("rejects proposals that reference missing or merged entities", async () => {
    await expect(
      service.propose(
        {
          kind: "add_player_to_team",
          playerId: "zen",
          teamId: "nope",
          effectiveDate: "2026-10-24",
        },
        source,
        "journalist",
      ),
    ).rejects.toThrow(NotFoundError);
    await expect(
      service.propose(
        { kind: "merge_players", keptId: "zen", duplicateId: "zen-dup" },
        source,
        "j",
      ),
    ).rejects.toThrow('was merged into "zen"');
  });

  it("applies the change with its source on approval", async () => {
    const { id } = await addZen();

    const approved = await service.approve(id, "admin");

    expect(players.joinTeam).toHaveBeenCalledWith("zen", {
      teamId: "kc",
      effectiveDate: "2026-10-24",
      sourceUrl: source,
    });
    expect(approved).toMatchObject({ status: "applied", reviewedById: "admin", entityId: "zen" });
  });

  it("flags players created from a start.gg source", async () => {
    const { id } = await service.propose(
      { kind: "create_player", name: "Atow", status: PlayerStatus.FREE_AGENT },
      "https://www.start.gg/tournament/rlcs/event/main",
      "journalist",
    );

    expect((await service.approve(id, "admin")).entityId).toBe("new-player");
    expect(players.create).toHaveBeenCalledWith({
      name: "Atow",
      status: PlayerStatus.FREE_AGENT,
      source: "startgg",
    });
  });

  it("keeps a proposal pending when the change fails", async () => {
    const { id } = await addZen();
    players.joinTeam.mockRejectedValueOnce(new InvalidInputError("Team is inactive"));

    await expect(service.approve(id, "admin")).rejects.toThrow("Team is inactive");
  });

  it("requires the change permission and reviews a proposal once", async () => {
    const { id } = await addZen();
    staff.allowed = false;
    await expect(service.approve(id, "journalist")).rejects.toThrow(ForbiddenError);

    staff.allowed = true;
    await service.reject(id, "admin");
    expect(saved.get(id)?.status).toBe("rejected");
    await expect(service.approve(id, "admin")).rejects.toThrow("already rejected");
    expect(players.joinTeam).not.toHaveBeenCalled();
  });
});
