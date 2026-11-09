import type { RosterChange } from "@sarpbc/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, InvalidInputError, NotFoundError } from "../../common/domain/errors";
import { Contract, Player, Team } from "../../roster/domain/roster";
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
    joinTeam: vi.fn(async () => zen),
    leaveTeam: vi.fn(),
  };
  const teams = {
    findById: vi.fn(async (id: string) => (id === "kc" ? kc : null)),
    create: vi.fn(async () => Object.assign(new Team(), { id: "new-team" })),
    update: vi.fn(async () => kc),
  };
  const stored = (key: string) => ({ key, url: `https://cdn.sarpbc.test/${key}` });
  const logos = {
    upload: vi.fn(async (teamId: string, variant: string) =>
      stored(`pending/teams/${teamId}/logo-${variant}-0123456789abcdef.webp`),
    ),
    publish: vi.fn(async (pendingKey: string) => stored(pendingKey.slice("pending/".length))),
    discard: vi.fn(async () => {}),
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
  const awardError = (tournamentId: string, playerId: string) => {
    if (tournamentId === "startgg-cup")
      return new InvalidInputError("Awards of start.gg tournaments cannot be proposed");
    if (tournamentId !== "cup")
      return new NotFoundError(`Tournament with id "${tournamentId}" not found`);
    if (playerId !== "zen") return new InvalidInputError(`${playerId} is not on the roster`);
    return null;
  };
  const awards = {
    requireProposable: vi.fn(async (tournamentId: string, _team: string, playerId: string) => {
      const error = awardError(tournamentId, playerId);
      if (error) throw error;
    }),
    createForTeam: vi.fn(async () => ({
      id: "award-1",
      awardType: "mvp" as const,
      player: { id: "zen", name: "zen", slug: "zen" },
      participant: { id: "part-kc" },
    })),
  };
  const rollingBack = {
    run: async <T>(work: (proposals: RosterProposalStore) => Promise<T>): Promise<T> => {
      const before = new Map(
        [...saved].map(([id, proposal]) => [
          id,
          Object.assign(new RosterProposal(), structuredClone(proposal)),
        ]),
      );
      try {
        return await work(store);
      } catch (error) {
        saved.clear();
        for (const [id, proposal] of before) saved.set(id, proposal);
        throw error;
      }
    },
  };
  const service = new RosterProposalService(
    store,
    rollingBack,
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
    awards,
    logos,
  );
  return { saved, store, players, teams, contracts, logos, staff, prizes, awards, service };
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
  let awards: ReturnType<typeof setup>["awards"];
  let service: RosterProposalService;

  beforeEach(() => {
    ({ saved, store, players, teams, contracts, logos, staff, prizes, awards, service } = setup());
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
        contractRole: "coach",
      },
      source,
      "journalist",
    );

    await service.approve(id, "admin");

    expect(players.joinTeam).toHaveBeenCalledWith("zen", {
      teamId: "kc",
      effectiveDate: "2026-10-24",
      sourceUrl: source,
      role: "coach",
    });
  });

  it("flags players created from a start.gg source", async () => {
    const { id } = await service.propose(
      { kind: "create_player", name: "Atow", status: "free_agent" },
      "https://www.start.gg/tournament/rlcs/event/main",
      "journalist",
    );

    expect((await service.approve(id, "admin")).entityId).toBe("new-player");
    expect(players.create).toHaveBeenCalledWith({
      name: "Atow",
      status: "free_agent",
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

    expect(saved.get(id)).toMatchObject({ status: "pending", reviewedById: null });
    expect((await service.list("pending")).proposals).toHaveLength(1);
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

  const award: Extract<RosterChange, { kind: "award_player" }> = {
    kind: "award_player",
    tournamentId: "cup",
    teamId: "kc",
    playerId: "zen",
    awardType: "mvp",
  };

  it("applies a sourced award once a tournament manager approves it", async () => {
    const { id } = await service.propose(award, source, "journalist");
    expect(awards.createForTeam).not.toHaveBeenCalled();

    const approved = await service.approve(id, "admin");

    expect(staff.permissions).toEqual(["tournaments.manage"]);
    expect(awards.createForTeam).toHaveBeenCalledWith("cup", "kc", "zen", "mvp");
    expect(approved).toMatchObject({ status: "applied", entityId: "award-1" });
  });

  it("rejects award proposals the tournament cannot take", async () => {
    const propose = (change: Partial<typeof award>) =>
      service.propose({ ...award, ...change }, source, "journalist");

    await expect(propose({ tournamentId: "missing" })).rejects.toThrow(NotFoundError);
    await expect(propose({ tournamentId: "startgg-cup" })).rejects.toThrow(InvalidInputError);
    await expect(propose({ playerId: "bench" })).rejects.toThrow(NotFoundError);
    await expect(propose({ teamId: "nope" })).rejects.toThrow(NotFoundError);
    awards.requireProposable.mockRejectedValueOnce(new InvalidInputError("already has"));
    await expect(propose({})).rejects.toThrow(InvalidInputError);
    expect(saved.size).toBe(0);
  });

  it("leaves an award proposal pending when approval finds the award already given", async () => {
    const { id } = await service.propose(award, source, "journalist");
    awards.createForTeam.mockRejectedValueOnce(new InvalidInputError("already has"));

    await expect(service.approve(id, "admin")).rejects.toThrow(InvalidInputError);

    expect(saved.get(id)).toMatchObject({ status: "pending", entityId: null });
  });

  it("names the award's tournament, team and player in the proposal list", async () => {
    await service.propose(award, source, "journalist");
    await service.list("pending");

    expect(store.names).toHaveBeenCalledWith(
      expect.objectContaining({ players: ["zen"], teams: ["kc"], tournaments: ["cup"] }),
    );
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
    const pendingKey = "pending/teams/kc/logo-dark-0123456789abcdef.webp";
    const pendingUrl = `https://cdn.sarpbc.test/${pendingKey}`;
    const publishedKey = "teams/kc/logo-dark-0123456789abcdef.webp";
    const publishedUrl = `https://cdn.sarpbc.test/${publishedKey}`;
    const proposeDarkLogo = () =>
      service.proposeTeamLogo(
        { teamId: "kc", variant: "dark", imageUrl: "https://kcorp.gg/logo-dark.svg" },
        source,
        "journalist",
      );

    it("stages the normalized asset and queues it for review without touching the team", async () => {
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
          logoKey: pendingKey,
          logoUrl: pendingUrl,
        },
      });
      expect(teams.update).not.toHaveBeenCalled();
      expect(logos.publish).not.toHaveBeenCalled();
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

    it("publishes the staged asset and sets only the proposed variant on approval", async () => {
      const { id } = await proposeDarkLogo();

      const approved = await service.approve(id, "admin");

      expect(logos.publish).toHaveBeenCalledExactlyOnceWith(pendingKey);
      expect(teams.update).toHaveBeenCalledExactlyOnceWith("kc", { logoDarkUrl: publishedUrl });
      expect(approved).toMatchObject({
        status: "applied",
        entityId: "kc",
        change: { logoKey: publishedKey, logoUrl: publishedUrl },
      });
      expect(logos.discard).not.toHaveBeenCalled();
    });

    it("deletes the staged asset when the proposal is rejected", async () => {
      const { id } = await proposeDarkLogo();

      const rejected = await service.reject(id, "admin");

      expect(logos.discard).toHaveBeenCalledExactlyOnceWith(pendingKey);
      expect(logos.publish).not.toHaveBeenCalled();
      expect(teams.update).not.toHaveBeenCalled();
      expect(rejected).toMatchObject({ status: "rejected" });
    });

    it("records no rejection when the staged asset cannot be deleted", async () => {
      const { id } = await proposeDarkLogo();
      logos.discard.mockRejectedValueOnce(new Error("R2 unavailable"));
      const save = vi.spyOn(store, "save");

      await expect(service.reject(id, "admin")).rejects.toThrow("R2 unavailable");
      expect(save).not.toHaveBeenCalled();
    });

    it("deletes the staged asset when the proposal cannot be recorded", async () => {
      const save = vi.spyOn(store, "save").mockRejectedValueOnce(new Error("database down"));

      await expect(proposeDarkLogo()).rejects.toThrow("database down");
      expect(logos.discard).toHaveBeenCalledExactlyOnceWith(pendingKey);
      save.mockRestore();
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
