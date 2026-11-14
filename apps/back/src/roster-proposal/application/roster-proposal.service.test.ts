import type {
  CircuitScaleTier,
  MatchLineupInput,
  RosterChange,
  StreamInput,
  Viewership,
} from "@sarpbc/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setupRosterProposalService as setup } from "../../../test/roster-proposal-service.setup";
import { ConflictError } from "../../common/domain/errors/conflict-error";
import { ForbiddenError } from "../../common/domain/errors/forbidden-error";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { Player } from "../../roster/domain/player";
import { RosterProposalService } from "./roster-proposal.service";

describe(RosterProposalService, () => {
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
  let merges: ReturnType<typeof setup>["merges"];
  let matches: ReturnType<typeof setup>["matches"];
  let streams: ReturnType<typeof setup>["streams"];
  let lineups: ReturnType<typeof setup>["lineups"];
  let viewerships: ReturnType<typeof setup>["viewerships"];
  let circuits: ReturnType<typeof setup>["circuits"];
  let teamAliases: ReturnType<typeof setup>["teamAliases"];
  let service: RosterProposalService;

  beforeEach(() => {
    ({
      saved,
      store,
      players,
      teams,
      contracts,
      merges,
      logos,
      staff,
      prizes,
      awards,
      matches,
      streams,
      lineups,
      viewerships,
      circuits,
      teamAliases,
      service,
    } = setup());
  });

  const proposeDarkLogo = async () =>
    await service.proposeTeamLogo(
      { imageUrl: "https://kcorp.gg/logo-dark.svg", teamId: "kc", variant: "dark" },
      source,
      "journalist",
    );

  const deleteMatch = async (matchId: string) =>
    await service.propose(
      { kind: "delete_match", matchId, reason: "Series imported twice" },
      "",
      "journalist",
    );

  const deleteTeam = async (teamId: string, mergeIntoTeamId?: string) =>
    await service.propose(
      { kind: "delete_team", mergeIntoTeamId, reason: "Empty duplicate", teamId },
      "",
      "journalist",
    );

  const addZen = async () =>
    await service.propose(
      { effectiveDate: "2026-10-24", kind: "add_player_to_team", playerId: "zen", teamId: "kc" },
      source,
      "journalist",
    );

  it("records a pending proposal without touching the roster", async () => {
    const proposal = await addZen();

    expect(proposal).toMatchObject({ sourceUrl: source, status: "pending" });
    expect(players.joinTeam).not.toHaveBeenCalled();
  });

  it("resolves listed names in one batched lookup per kind", async () => {
    await addZen();
    await addZen();
    players.findById.mockClear();

    const { proposals, names } = await service.list("pending");

    expect(proposals).toHaveLength(2);
    expect(names).toStrictEqual({ kc: "Karmine Corp", zen: "zen" });
    expect(store.names).toHaveBeenCalledExactlyOnceWith({
      circuits: [],
      events: [],
      matches: [],
      players: ["zen"],
      seasons: [],
      teams: ["kc"],
      tournaments: [],
      users: ["journalist"],
    });
    expect(players.findById).not.toHaveBeenCalled();
  });

  it("rejects proposals that reference missing or merged entities", async () => {
    await expect(
      service.propose(
        {
          effectiveDate: "2026-10-24",
          kind: "add_player_to_team",
          playerId: "zen",
          teamId: "nope",
        },
        source,
        "journalist",
      ),
    ).rejects.toThrow(NotFoundError);
    await expect(
      service.propose(
        { duplicateId: "zen-dup", keptId: "zen", kind: "merge_players" },
        source,
        "j",
      ),
    ).rejects.toThrow('was merged into "zen"');
  });

  it("applies the change with its source on approval", async () => {
    const { id } = await addZen();

    const approved = await service.approve(id, "admin");

    expect(players.joinTeam).toHaveBeenCalledWith("zen", {
      effectiveDate: "2026-10-24",
      sourceUrl: source,
      teamId: "kc",
    });
    expect(approved).toMatchObject({ entityId: "zen", reviewedById: "admin", status: "applied" });
  });

  it("applies a roster move with its staff role", async () => {
    const { id } = await service.propose(
      {
        contractRole: "coach",
        effectiveDate: "2026-10-24",
        kind: "add_player_to_team",
        playerId: "zen",
        teamId: "kc",
      },
      source,
      "journalist",
    );

    await service.approve(id, "admin");

    expect(players.joinTeam).toHaveBeenCalledWith("zen", {
      effectiveDate: "2026-10-24",
      role: "coach",
      sourceUrl: source,
      teamId: "kc",
    });
  });

  it("flags players created from a start.gg source", async () => {
    const { id } = await service.propose(
      { kind: "create_player", name: "Atow", status: "free_agent" },
      "https://www.start.gg/tournament/rlcs/event/main",
      "journalist",
    );

    const approveResult = await service.approve(id, "admin");
    expect(approveResult.entityId).toBe("new-player");
    expect(players.create).toHaveBeenCalledWith({
      name: "Atow",
      source: "startgg",
      status: "free_agent",
    });
  });

  it("records a sourced career contract on approval", async () => {
    const { id } = await service.propose(
      {
        endDate: "2023-06-30",
        kind: "create_contract",
        playerId: "zen",
        startDate: "2022-01-10",
        teamId: "kc",
      },
      source,
      "journalist",
    );

    const approveResult2 = await service.approve(id, "admin");
    expect(approveResult2.entityId).toBe("new-contract");
    expect(contracts.recordPeriod).toHaveBeenCalledWith("zen", {
      endDate: "2023-06-30",
      role: undefined,
      sourceUrl: source,
      startDate: "2022-01-10",
      teamId: "kc",
    });
  });

  it("only proposes updates to a contract of the named player", async () => {
    await expect(
      service.propose(
        { contractId: "other", endDate: null, kind: "update_contract", playerId: "zen" },
        source,
        "journalist",
      ),
    ).rejects.toThrow(NotFoundError);

    const { id } = await service.propose(
      { contractId: "zen-kc", endDate: "2024-01-01", kind: "update_contract", playerId: "zen" },
      source,
      "journalist",
    );

    await service.approve(id, "admin");

    expect(contracts.revisePeriod).toHaveBeenCalledWith("zen", "zen-kc", {
      endDate: "2024-01-01",
      role: undefined,
      sourceUrl: source,
      startDate: undefined,
      teamId: undefined,
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

    expect(saved.get(id)).toMatchObject({ reviewedById: null, status: "pending" });
    const listResult = await service.list("pending");
    expect(listResult.proposals).toHaveLength(1);
  });

  const prizeEntry = {
    amount: 1000,
    currency: "USD",
    placement: 1,
    playerIds: ["zen"],
    teamId: "kc",
  };

  it("applies a sourced prize distribution once a tournament manager approves it", async () => {
    const { id } = await service.propose(
      { kind: "set_tournament_prizes", prizes: [prizeEntry], tournamentId: "cup" },
      source,
      "journalist",
    );

    expect(prizes.setDistribution).not.toHaveBeenCalled();

    const approved = await service.approve(id, "admin");

    expect(staff.permissions).toStrictEqual(["tournaments.manage"]);
    expect(prizes.setDistribution).toHaveBeenCalledWith("cup", [
      { ...prizeEntry, sourceUrl: source },
    ]);
    expect(approved).toMatchObject({ entityId: "cup", status: "applied" });
  });

  it("applies a prize row correction with the proposal's source", async () => {
    const { id } = await service.propose(
      { kind: "update_tournament_prize", patch: {}, teamId: "kc", tournamentId: "cup" },
      source,
      "journalist",
    );

    const approved = await service.approve(id, "admin");

    expect(staff.permissions).toStrictEqual(["tournaments.manage"]);
    expect(prizes.updateEntry).toHaveBeenCalledWith("cup", "kc", {}, source);
    expect(approved).toMatchObject({ entityId: "cup", status: "applied" });
  });

  it("refuses a prize row correction for a team without a prize", async () => {
    await expect(
      service.propose(
        { kind: "update_tournament_prize", patch: {}, teamId: "zen", tournamentId: "cup" },
        source,
        "journalist",
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("refuses a BLAST.tv or Liquipedia mirror source for any proposal", async () => {
    await Promise.all(
      ["https://blast.tv/rl/open", "https://liquipedia-mirror.example/x"].map(async (sourceUrl) => {
        await expect(
          service.propose(
            { kind: "update_tournament_prize", patch: {}, teamId: "kc", tournamentId: "cup" },
            sourceUrl,
            "journalist",
          ),
        ).rejects.toThrow(InvalidInputError);
      }),
    );
  });

  it("rejects prize proposals with an unknown or start.gg tournament, team or invalid currency", async () => {
    const proposePrizes = async (tournamentId: string, entry: typeof prizeEntry) =>
      await service.propose(
        { kind: "set_tournament_prizes", prizes: [entry], tournamentId },
        source,
        "journalist",
      );

    await expect(proposePrizes("missing", prizeEntry)).rejects.toThrow(NotFoundError);
    await expect(proposePrizes("startgg-cup", prizeEntry)).rejects.toThrow(InvalidInputError);
    await expect(proposePrizes("cup", { ...prizeEntry, teamId: "nope" })).rejects.toThrow(
      NotFoundError,
    );
    await expect(proposePrizes("cup", { ...prizeEntry, currency: "XYZ" })).rejects.toThrow(
      InvalidInputError,
    );
    expect(saved.size).toBe(0);
  });

  const award: Extract<RosterChange, { kind: "award_player" }> = {
    awardType: "mvp",
    kind: "award_player",
    playerId: "zen",
    teamId: "kc",
    tournamentId: "cup",
  };

  const propose = async (change: Partial<typeof award>) =>
    await service.propose({ ...award, ...change }, source, "journalist");

  it("applies a sourced award once a tournament manager approves it", async () => {
    const { id } = await service.propose(award, source, "journalist");
    expect(awards.createForTeam).not.toHaveBeenCalled();

    const approved = await service.approve(id, "admin");

    expect(staff.permissions).toStrictEqual(["tournaments.manage"]);
    expect(awards.createForTeam).toHaveBeenCalledWith("cup", "kc", "zen", "mvp");
    expect(approved).toMatchObject({ entityId: "award-1", status: "applied" });
  });

  it("applies a Grand Finals MVP proposal through the same path as the admin", async () => {
    const { id } = await service.propose(
      { ...award, awardType: "grand_finals_mvp" },
      source,
      "journalist",
    );

    expect(awards.requireProposable).toHaveBeenCalledWith("cup", "kc", "zen", "grand_finals_mvp");
    await service.approve(id, "admin");

    expect(awards.createForTeam).toHaveBeenCalledWith("cup", "kc", "zen", "grand_finals_mvp");
  });

  it("rejects award proposals for an unknown or start.gg tournament and an unknown player", async () => {
    await expect(propose({ tournamentId: "missing" })).rejects.toThrow(NotFoundError);
    await expect(propose({ tournamentId: "startgg-cup" })).rejects.toThrow(InvalidInputError);
    await expect(propose({ playerId: "bench" })).rejects.toThrow(NotFoundError);
    expect(saved.size).toBe(0);
  });

  it("rejects award proposals for an unknown team or an award already given", async () => {
    await expect(propose({ teamId: "nope" })).rejects.toThrow(NotFoundError);
    awards.requireProposable.mockRejectedValueOnce(new InvalidInputError("already has"));
    await expect(propose({})).rejects.toThrow(InvalidInputError);
    expect(saved.size).toBe(0);
  });

  it("leaves an award proposal pending when approval finds the award already given", async () => {
    const { id } = await service.propose(award, source, "journalist");
    awards.createForTeam.mockRejectedValueOnce(new InvalidInputError("already has"));

    await expect(service.approve(id, "admin")).rejects.toThrow(InvalidInputError);

    expect(saved.get(id)).toMatchObject({ entityId: null, status: "pending" });
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

    it("stages the normalized asset and queues it for review without touching the team", async () => {
      const proposal = await proposeDarkLogo();

      expect(logos.upload).toHaveBeenCalledWith("kc", "dark", "https://kcorp.gg/logo-dark.svg");
      expect(proposal).toMatchObject({
        change: {
          imageUrl: "https://kcorp.gg/logo-dark.svg",
          kind: "upload_team_logo",
          logoKey: pendingKey,
          logoUrl: pendingUrl,
          teamId: "kc",
          variant: "dark",
        },
        sourceUrl: source,
        status: "pending",
      });
      expect(teams.update).not.toHaveBeenCalled();
      expect(logos.publish).not.toHaveBeenCalled();
    });

    it("does not download anything for an unknown team", async () => {
      await expect(
        service.proposeTeamLogo(
          { imageUrl: "https://kcorp.gg/logo.png", teamId: "nope", variant: "light" },
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
        change: { logoKey: publishedKey, logoUrl: publishedUrl },
        entityId: "kc",
        status: "applied",
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

  describe("deletions", () => {
    it("records a pending match deletion without deleting anything", async () => {
      const proposal = await deleteMatch("dup-match");

      expect(proposal).toMatchObject({ sourceUrl: "", status: "pending" });
      expect(matches.requireProposableDeletion).toHaveBeenCalledWith("dup-match");
      expect(matches.deleteMatch).not.toHaveBeenCalled();
    });

    it("refuses to propose deleting a missing, PandaScore or start.gg match", async () => {
      await expect(deleteMatch("missing-match")).rejects.toThrow(NotFoundError);
      await expect(deleteMatch("pandascore-match")).rejects.toThrow("synced from PandaScore");
      await expect(deleteMatch("startgg-match")).rejects.toThrow("start.gg");
      expect(saved.size).toBe(0);
    });

    it("deletes the match through the staff deletion path once a tournament manager approves", async () => {
      const { id } = await deleteMatch("dup-match");

      const approved = await service.approve(id, "admin");

      expect(staff.permissions).toStrictEqual(["tournaments.manage"]);
      expect(matches.deleteMatch).toHaveBeenCalledExactlyOnceWith("dup-match");
      expect(approved).toMatchObject({ entityId: "dup-match", status: "applied" });
    });

    it("keeps a match deletion pending when the guard refuses it at approval", async () => {
      const { id } = await deleteMatch("dup-match");
      matches.deleteMatch.mockRejectedValueOnce(new ConflictError("Final still has 2 comments"));

      await expect(service.approve(id, "admin")).rejects.toThrow(ConflictError);

      expect(saved.get(id)).toMatchObject({ entityId: null, status: "pending" });
    });

    it("names the match a pending deletion targets", async () => {
      await deleteMatch("dup-match");

      await service.list("pending");

      expect(store.names).toHaveBeenCalledWith(expect.objectContaining({ matches: ["dup-match"] }));
    });

    it("refuses to propose deleting a referenced or missing team", async () => {
      await expect(deleteTeam("kc")).rejects.toThrow("still has 3 contracts");
      await expect(deleteTeam("nope")).rejects.toThrow(NotFoundError);
      expect(saved.size).toBe(0);
    });

    it("deletes an empty team once a team manager approves", async () => {
      const { id } = await deleteTeam("kc-copy");
      expect(teams.delete).not.toHaveBeenCalled();

      const approved = await service.approve(id, "admin");

      expect(staff.permissions).toStrictEqual(["teams.manage"]);
      expect(teams.delete).toHaveBeenCalledExactlyOnceWith("kc-copy");
      expect(approved).toMatchObject({ entityId: "kc-copy", status: "applied" });
    });

    it("keeps a team deletion pending when the team gained references since the proposal", async () => {
      const { id } = await deleteTeam("kc-copy");
      teams.delete.mockRejectedValueOnce(
        new ConflictError("Karmine Corp Esports still has 1 match"),
      );

      await expect(service.approve(id, "admin")).rejects.toThrow("still has 1 match");

      expect(saved.get(id)?.status).toBe("pending");
    });

    it("merges into the named team instead of deleting it", async () => {
      const { id } = await deleteTeam("kc-copy", "kc");
      expect(teams.requireDeletable).not.toHaveBeenCalled();

      const approved = await service.approve(id, "admin");

      expect(merges.mergeTeams).toHaveBeenCalledExactlyOnceWith("kc", "kc-copy");
      expect(teams.delete).not.toHaveBeenCalled();
      expect(approved).toMatchObject({ entityId: "kc", status: "applied" });
    });

    it("refuses to merge a team into itself or into a missing team", async () => {
      await expect(deleteTeam("kc-copy", "kc-copy")).rejects.toThrow("into itself");
      await expect(deleteTeam("kc-copy", "nope")).rejects.toThrow(NotFoundError);
    });
  });

  describe("stream proposals", () => {
    const list: StreamInput[] = [
      { kind: "official", language: "en", url: "https://twitch.tv/rlesports" },
      { kind: "costream", language: "fr", url: "https://twitch.tv/kameto" },
    ];

    const setMatchStreams = async (sourceUrl: string, matchId = "match-1") =>
      await service.propose(
        { kind: "set_match_streams", matchId, streams: list },
        sourceUrl,
        "journalist",
      );

    it("validates a stream list and keeps it pending until approval", async () => {
      const proposal = await setMatchStreams(source);

      expect(proposal).toMatchObject({ change: { streams: list }, status: "pending" });
      expect(streams.requireProposable).toHaveBeenCalledWith(
        { id: "match-1", kind: "match" },
        list,
      );
      expect(streams.set).not.toHaveBeenCalled();
    });

    it("refuses an invalid list or a start.gg match before recording anything", async () => {
      await expect(
        service.propose(
          {
            kind: "set_tournament_streams",
            streams: [{ kind: "official", language: "en", url: "http://twitch.tv/rl" }],
            tournamentId: "stage-1",
          },
          source,
          "journalist",
        ),
      ).rejects.toThrow("must use https");
      await expect(setMatchStreams(source, "startgg-match")).rejects.toThrow("start.gg");
      expect(saved.size).toBe(0);
    });

    it("replaces the whole list on approval and marks start.gg sourced streams", async () => {
      const manual = await setMatchStreams(source);

      const startgg = await service.propose(
        { eventId: "event-1", kind: "set_event_streams", streams: list },
        "https://www.start.gg/tournament/rl-open",
        "journalist",
      );

      await expect(service.approve(manual.id, "admin")).resolves.toMatchObject({
        entityId: "match-1",
      });
      await expect(service.approve(startgg.id, "admin")).resolves.toMatchObject({
        entityId: "event-1",
      });

      expect(streams.set).toHaveBeenNthCalledWith(
        1,
        { id: "match-1", kind: "match" },
        list,
        "manual",
      );
      expect(streams.set).toHaveBeenNthCalledWith(
        2,
        { id: "event-1", kind: "event" },
        list,
        "startgg",
      );
      const [, result] = streams.set.mock.results;
      const applied = result?.type === "return" ? await result.value : undefined;
      expect(applied?.streams.map((stream) => stream.source)).toStrictEqual(["startgg", "startgg"]);
    });

    it("asks the reviewer for the tournament permission", async () => {
      const { id } = await setMatchStreams(source);
      staff.allowed = false;

      await expect(service.approve(id, "admin")).rejects.toThrow(ForbiddenError);
      expect(staff.permissions).toContain("tournaments.manage");
      expect(streams.set).not.toHaveBeenCalled();
    });
  });

  describe("lineup proposals", () => {
    const sides: MatchLineupInput[] = [
      { participantId: "part-kc", playerIds: ["zen"] },
      { participantId: "part-bds", playerIds: [] },
    ];

    const setLineups = async (sourceUrl: string, matchId = "match-1") =>
      await service.propose(
        { kind: "set_match_lineups", lineups: sides, matchId },
        sourceUrl,
        "journalist",
      );

    it("validates the lineups and keeps them pending until approval", async () => {
      const proposal = await setLineups(source);

      expect(proposal).toMatchObject({ sourceUrl: source, status: "pending" });
      expect(lineups.requireProposable).toHaveBeenCalledExactlyOnceWith("match-1", sides);
      expect(players.findById).toHaveBeenCalledWith("zen");
      expect(lineups.set).not.toHaveBeenCalled();
    });

    it("replaces the match lineups on approval", async () => {
      const { id } = await setLineups(source);

      const approved = await service.approve(id, "admin");

      expect(lineups.set).toHaveBeenCalledExactlyOnceWith("match-1", sides);
      expect(approved).toMatchObject({ entityId: "match-1", status: "applied" });
      expect(staff.permissions).toContain("tournaments.manage");
    });

    it("refuses a start.gg match, a start.gg source or an unknown player", async () => {
      await expect(setLineups(source, "startgg-match")).rejects.toThrow("start.gg match");
      await expect(setLineups("https://www.start.gg/tournament/rl-open")).rejects.toThrow(
        "sourced from start.gg",
      );
      await expect(
        service.propose(
          {
            kind: "set_match_lineups",
            lineups: [{ participantId: "part-kc", playerIds: ["ghost"] }],
            matchId: "match-1",
          },
          source,
          "journalist",
        ),
      ).rejects.toThrow(NotFoundError);
      expect(saved.size).toBe(0);
    });

    it("leaves the proposal pending when the lineups no longer apply", async () => {
      const { id } = await setLineups(source);
      lineups.set.mockRejectedValueOnce(new InvalidInputError("Participant does not play"));

      await expect(service.approve(id, "admin")).rejects.toThrow("does not play");
      expect(saved.get(id)?.status).toBe("pending");
    });
  });

  describe("viewership proposals", () => {
    const viewership: Viewership = {
      averageViewers: 31_000,
      measuredAt: null,
      peakViewers: 52_000,
      scope: "official",
      sourceName: "Esports Charts",
      sourceUrl: "https://escharts.com/tournaments/rl/fake-open",
    };

    it("keeps a credited viewership pending until a staff member approves it", async () => {
      const proposal = await service.propose(
        { kind: "set_match_viewership", matchId: "match-1", viewership },
        viewership.sourceUrl,
        "journalist",
      );

      expect(proposal).toMatchObject({ change: { viewership }, status: "pending" });
      expect(viewerships.requireProposable).toHaveBeenCalledWith(
        { id: "match-1", kind: "match" },
        viewership,
      );
      expect(viewerships.set).not.toHaveBeenCalled();

      await expect(service.approve(proposal.id, "admin")).resolves.toMatchObject({
        entityId: "match-1",
      });
      expect(viewerships.set).toHaveBeenCalledExactlyOnceWith(
        { id: "match-1", kind: "match" },
        viewership,
      );
    });

    it("refuses a missing credit or a start.gg match before recording anything", async () => {
      await expect(
        service.propose(
          {
            eventId: "event-1",
            kind: "set_event_viewership",
            viewership: { ...viewership, sourceName: " " },
          },
          viewership.sourceUrl,
          "journalist",
        ),
      ).rejects.toThrow("name of its source");
      await expect(
        service.propose(
          { kind: "set_match_viewership", matchId: "startgg-match", viewership },
          viewership.sourceUrl,
          "journalist",
        ),
      ).rejects.toThrow("start.gg");
      expect(saved.size).toBe(0);
    });

    it("names the event of a pending event viewership", async () => {
      await service.propose(
        { eventId: "event-1", kind: "set_event_viewership", viewership },
        viewership.sourceUrl,
        "journalist",
      );
      await service.list("pending");
      expect(store.names).toHaveBeenCalledWith(expect.objectContaining({ events: ["event-1"] }));
    });
  });

  describe("circuit scale proposals", () => {
    const scale: CircuitScaleTier[] = [{ from: 1, points: 10, to: 1 }];
    const rules = "https://example.org/official-rules";

    const setScale = async (tournamentId = "ps-stage") =>
      await service.propose(
        { circuitId: "circuit-1", kind: "set_circuit_stage_scale", scale, tournamentId },
        rules,
        "journalist",
      );

    const input = { scale, sourceUrl: rules };

    it("checks the stage and keeps the scale pending until approval", async () => {
      const proposal = await setScale();

      expect(proposal).toMatchObject({ sourceUrl: rules, status: "pending" });
      expect(circuits.requireStageSettings).toHaveBeenCalledWith("circuit-1", "ps-stage", input);
      expect(circuits.setStageScale).not.toHaveBeenCalled();
    });

    it("refuses a missing stage before recording anything", async () => {
      await expect(setScale("missing-stage")).rejects.toThrow(NotFoundError);
      expect(saved.size).toBe(0);
    });

    it("applies the scale with the proposal source on approval", async () => {
      const { id } = await setScale();

      await expect(service.approve(id, "admin")).resolves.toMatchObject({ entityId: "circuit-1" });
      expect(circuits.setStageScale).toHaveBeenCalledWith("circuit-1", "ps-stage", input);
      expect(staff.permissions).toContain("tournaments.manage");
    });

    it("carries the region teams and final placements, which must be known teams", async () => {
      const change = {
        circuitId: "circuit-1",
        finishes: [{ placement: 13, teamId: "kc" }],
        kind: "set_circuit_stage_scale" as const,
        regionTeamIds: ["kc"],
        scale,
        tournamentId: "major",
        worldwide: true,
      };

      const { id } = await service.propose(change, rules, "journalist");

      await service.approve(id, "admin");
      expect(circuits.setStageScale).toHaveBeenCalledWith("circuit-1", "major", {
        finishes: [{ placement: 13, teamId: "kc" }],
        regionTeamIds: ["kc"],
        scale,
        sourceUrl: rules,
        worldwide: true,
      });
      await expect(
        service.propose({ ...change, regionTeamIds: ["missing-team"] }, rules, "journalist"),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("team aliases", () => {
    const alias = {
      from: "2023-01-01",
      logoUrl: null,
      name: "Fixture Esports",
      pandascoreId: null,
      to: "2024-06-01",
    };

    it("checks the alias with the proposal source and keeps it pending", async () => {
      const proposal = await service.propose(
        { alias, kind: "add_team_alias", teamId: "kc" },
        source,
        "journalist",
      );

      expect(proposal).toMatchObject({ sourceUrl: source, status: "pending" });
      expect(teamAliases.requireProposable).toHaveBeenCalledWith("kc", {
        ...alias,
        sourceUrl: source,
      });
      expect(teamAliases.add).not.toHaveBeenCalled();
    });

    it("refuses a Liquipedia source and an unknown team before recording anything", async () => {
      await expect(
        service.propose(
          { alias, kind: "add_team_alias", teamId: "kc" },
          "https://liquipedia.net/rocketleague/Karmine_Corp",
          "journalist",
        ),
      ).rejects.toThrow("Liquipedia");
      await expect(
        service.propose({ alias, kind: "add_team_alias", teamId: "nope" }, source, "journalist"),
      ).rejects.toThrow(NotFoundError);
      expect(saved.size).toBe(0);
    });

    describe("approved by a team manager", () => {
      let addedResult: Awaited<ReturnType<typeof service.approve>>;
      let updatedResult: Awaited<ReturnType<typeof service.approve>>;

      beforeEach(async () => {
        const added = await service.propose(
          { alias, kind: "add_team_alias", teamId: "kc" },
          source,
          "journalist",
        );

        const updated = await service.propose(
          { alias, aliasId: "alias-1", kind: "update_team_alias", teamId: "kc" },
          source,
          "journalist",
        );

        addedResult = await service.approve(added.id, "admin");
        updatedResult = await service.approve(updated.id, "admin");
      });

      it("applies both proposals to the team", () => {
        expect(addedResult).toMatchObject({ entityId: "kc" });
        expect(updatedResult).toMatchObject({ entityId: "kc" });
      });

      it("adds the alias with the proposal source", () => {
        expect(teamAliases.add).toHaveBeenCalledWith("kc", { ...alias, sourceUrl: source });
      });

      it("updates the alias with the proposal source", () => {
        expect(teamAliases.update).toHaveBeenCalledWith("kc", "alias-1", {
          ...alias,
          sourceUrl: source,
        });
      });

      it("leaves the team untouched and requires the team permission for each approval", () => {
        expect(teams.update).not.toHaveBeenCalled();
        expect(merges.mergeTeams).not.toHaveBeenCalled();
        expect(staff.permissions).toStrictEqual(["teams.manage", "teams.manage"]);
      });
    });
  });
});
