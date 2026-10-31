import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, InvalidInputError, NotFoundError } from "../../common/domain/errors";
import { Contract, ContractRole, Player, PlayerStatus, Team } from "../../roster/domain/roster";
import { RosterProposal } from "../domain/roster-proposal";
import type { RosterProposalStore } from "./ports";
import { RosterProposalService } from "./roster-proposal.service";

function setup() {
  const saved = new Map<string, RosterProposal>();
  let sequence = 0;
  const store = {
    findById: async (id) => saved.get(id) ?? null,
    list: async (status) => [...saved.values()].filter((p) => p.status === status),
    save: async (proposal) => {
      proposal.id ||= `proposal-${++sequence}`;
      saved.set(proposal.id, proposal);
    },
    names: vi.fn(async () => ({ zen: "zen", kc: "Karmine Corp" })),
  } satisfies RosterProposalStore;
  const zen = Object.assign(new Player(), { id: "zen", name: "zen" });
  const kc = Object.assign(new Team(), { id: "kc", name: "Karmine Corp" });
  const players = {
    findById: vi.fn(async (id: string) => (id === "zen" || id === "zen-dup" ? zen : null)),
    create: vi.fn(async () => Object.assign(new Player(), { id: "new-player" })),
    update: vi.fn(async () => zen),
    joinTeam: vi.fn(async () => ({ player: zen, opened: null, closed: [] })),
    leaveTeam: vi.fn(),
  };
  const teams = {
    findById: vi.fn(async (id: string) => (id === "kc" ? kc : null)),
    create: vi.fn(async () => Object.assign(new Team(), { id: "new-team" })),
    update: vi.fn(async () => kc),
  };
  const logos = {
    upload: vi.fn(
      async (teamId: string, variant: string) =>
        `https://cdn.sarpbc.test/teams/${teamId}/logo-${variant}-0123456789abcdef.webp`,
    ),
  };
  const contracts = {
    getContractsByPlayer: vi.fn(async () => [Object.assign(new Contract(), { id: "zen-kc" })]),
    recordPeriod: vi.fn(async () => Object.assign(new Contract(), { id: "new-contract" })),
    revisePeriod: vi.fn(async () => Object.assign(new Contract(), { id: "zen-kc" })),
  };
  const merges = { mergePlayers: vi.fn(), mergeTeams: vi.fn() };
  const permissions: string[] = [];
  const staff = { allowed: true, permissions };
  const prizes = {
    requireProposableTournament: vi.fn(async (id: string) => {
      if (id === "startgg-cup")
        throw new InvalidInputError(
          "Prize distributions of start.gg tournaments cannot be proposed",
        );
      if (id !== "cup") throw new NotFoundError(`Tournament with id "${id}" not found`);
    }),
    setDistribution: vi.fn(),
  };
  const service = new RosterProposalService(
    store,
    { run: (work) => work(store) },
    players,
    teams,
    contracts,
    merges,
    {
      hasAnyPermission: async (_: string, permissions: string[]) => {
        staff.permissions.push(...permissions);
        return staff.allowed;
      },
    },
    prizes,
    logos,
  );
  return { saved, store, players, teams, contracts, logos, staff, prizes, service };
}

describe("RosterProposalService", () => {
  const source = "https://x.com/KarmineCorp/status/1";
  let saved: ReturnType<typeof setup>["saved"];
  let store: ReturnType<typeof setup>["store"];
  let players: ReturnType<typeof setup>["players"];
  let contracts: ReturnType<typeof setup>["contracts"];
  let teams: ReturnType<typeof setup>["teams"];
  let logos: ReturnType<typeof setup>["logos"];
  let staff: ReturnType<typeof setup>["staff"];
  let prizes: ReturnType<typeof setup>["prizes"];
  let service: RosterProposalService;

  beforeEach(() => {
    ({ saved, store, players, teams, contracts, logos, staff, prizes, service } = setup());
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

  it("resolves listed names in one batched lookup per kind", async () => {
    await addZen();
    await addZen();
    players.findById.mockClear();

    const { proposals, names } = await service.list("pending");

    expect(proposals).toHaveLength(2);
    expect(names).toEqual({ zen: "zen", kc: "Karmine Corp" });
    expect(store.names).toHaveBeenCalledExactlyOnceWith({
      players: ["zen"],
      teams: ["kc"],
      users: ["journalist"],
      tournaments: [],
    });
    expect(players.findById).not.toHaveBeenCalled();
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

  it("applies a roster move with its staff role", async () => {
    const { id } = await service.propose(
      {
        kind: "add_player_to_team",
        playerId: "zen",
        teamId: "kc",
        effectiveDate: "2026-10-24",
        contractRole: ContractRole.COACH,
      },
      source,
      "journalist",
    );

    await service.approve(id, "admin");

    expect(players.joinTeam).toHaveBeenCalledWith("zen", {
      teamId: "kc",
      effectiveDate: "2026-10-24",
      sourceUrl: source,
      role: ContractRole.COACH,
    });
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

  it("records a sourced career contract on approval", async () => {
    const { id } = await service.propose(
      {
        kind: "create_contract",
        playerId: "zen",
        teamId: "kc",
        startDate: "2022-01-10",
        endDate: "2023-06-30",
      },
      source,
      "journalist",
    );

    expect((await service.approve(id, "admin")).entityId).toBe("new-contract");
    expect(contracts.recordPeriod).toHaveBeenCalledWith("zen", {
      teamId: "kc",
      startDate: "2022-01-10",
      endDate: "2023-06-30",
      role: undefined,
      sourceUrl: source,
    });
  });

  it("only proposes updates to a contract of the named player", async () => {
    await expect(
      service.propose(
        { kind: "update_contract", contractId: "other", playerId: "zen", endDate: null },
        source,
        "journalist",
      ),
    ).rejects.toThrow(NotFoundError);

    const { id } = await service.propose(
      { kind: "update_contract", contractId: "zen-kc", playerId: "zen", endDate: "2024-01-01" },
      source,
      "journalist",
    );
    await service.approve(id, "admin");

    expect(contracts.revisePeriod).toHaveBeenCalledWith("zen", "zen-kc", {
      teamId: undefined,
      startDate: undefined,
      endDate: "2024-01-01",
      role: undefined,
      sourceUrl: source,
    });
  });

  it("refuses to apply a change to a player merged since the proposal", async () => {
    const { id } = await addZen();
    players.findById.mockResolvedValueOnce(Object.assign(new Player(), { id: "kept" }));

    await expect(service.approve(id, "admin")).rejects.toThrow('was merged into "kept"');
    expect(players.joinTeam).not.toHaveBeenCalled();
    expect(saved.get(id)?.status).toBe("pending");
  });

  it("keeps a proposal pending when the change fails", async () => {
    const { id } = await addZen();
    players.joinTeam.mockRejectedValueOnce(new InvalidInputError("Team is inactive"));

    await expect(service.approve(id, "admin")).rejects.toThrow("Team is inactive");
  });

  const prizeEntry = {
    placement: 1,
    amount: 1000,
    currency: "USD",
    teamId: "kc",
    playerIds: ["zen"],
  };

  it("applies a sourced prize distribution once a tournament manager approves it", async () => {
    const { id } = await service.propose(
      { kind: "set_tournament_prizes", tournamentId: "cup", prizes: [prizeEntry] },
      source,
      "journalist",
    );
    expect(prizes.setDistribution).not.toHaveBeenCalled();

    const approved = await service.approve(id, "admin");

    expect(staff.permissions).toEqual(["tournaments.manage"]);
    expect(prizes.setDistribution).toHaveBeenCalledWith("cup", [prizeEntry]);
    expect(approved).toMatchObject({ status: "applied", entityId: "cup" });
  });

  it("rejects prize proposals with an unknown or start.gg tournament, team or invalid currency", async () => {
    const propose = (tournamentId: string, entry: typeof prizeEntry) =>
      service.propose(
        { kind: "set_tournament_prizes", tournamentId, prizes: [entry] },
        source,
        "journalist",
      );

    await expect(propose("missing", prizeEntry)).rejects.toThrow(NotFoundError);
    await expect(propose("startgg-cup", prizeEntry)).rejects.toThrow(InvalidInputError);
    await expect(propose("cup", { ...prizeEntry, teamId: "nope" })).rejects.toThrow(NotFoundError);
    await expect(propose("cup", { ...prizeEntry, currency: "XYZ" })).rejects.toThrow(
      InvalidInputError,
    );
    expect(saved.size).toBe(0);
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

  describe("team logos", () => {
    const logoUrl = "https://cdn.sarpbc.test/teams/kc/logo-dark-0123456789abcdef.webp";
    const proposeDarkLogo = () =>
      service.proposeTeamLogo(
        { teamId: "kc", variant: "dark", imageUrl: "https://kcorp.gg/logo-dark.svg" },
        source,
        "journalist",
      );

    it("stores the normalized asset and queues it for review without touching the team", async () => {
      const proposal = await proposeDarkLogo();

      expect(logos.upload).toHaveBeenCalledWith("kc", "dark", "https://kcorp.gg/logo-dark.svg");
      expect(proposal).toMatchObject({
        status: "pending",
        sourceUrl: source,
        change: {
          kind: "upload_team_logo",
          teamId: "kc",
          variant: "dark",
          imageUrl: "https://kcorp.gg/logo-dark.svg",
          logoUrl,
        },
      });
      expect(teams.update).not.toHaveBeenCalled();
    });

    it("does not download anything for an unknown team", async () => {
      await expect(
        service.proposeTeamLogo(
          { teamId: "nope", variant: "light", imageUrl: "https://kcorp.gg/logo.png" },
          source,
          "journalist",
        ),
      ).rejects.toThrow(NotFoundError);
      expect(logos.upload).not.toHaveBeenCalled();
      expect(saved.size).toBe(0);
    });

    it("records nothing when the asset is rejected", async () => {
      logos.upload.mockRejectedValueOnce(
        new InvalidInputError("The logo must be a PNG, WebP or SVG image."),
      );

      await expect(proposeDarkLogo()).rejects.toThrow("PNG, WebP or SVG");
      expect(saved.size).toBe(0);
    });

    it("sets only the proposed variant on approval", async () => {
      const { id } = await proposeDarkLogo();

      const approved = await service.approve(id, "admin");

      expect(teams.update).toHaveBeenCalledExactlyOnceWith("kc", { logoDarkUrl: logoUrl });
      expect(approved).toMatchObject({ status: "applied", entityId: "kc" });
    });

    it("requires teams.manage to review", async () => {
      const { id } = await proposeDarkLogo();
      staff.allowed = false;

      await expect(service.approve(id, "journalist")).rejects.toThrow(
        "Reviewing this proposal requires teams.manage",
      );
      expect(teams.update).not.toHaveBeenCalled();
    });
  });
});
