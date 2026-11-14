import type {
  CircuitScaleTier,
  MatchLineupInput,
  RosterChange,
  StreamInput,
  Viewership,
} from "@sarpbc/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setupRosterProposalService as setup } from "../../../test/roster-proposal-service.setup";
import {
  ConflictError,
  ForbiddenError,
  InvalidInputError,
  NotFoundError,
} from "../../common/domain/errors";
import { Player } from "../../roster/domain/roster";
import type { RosterProposalService } from "./roster-proposal.service";

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
      matches: [],
      events: [],
      circuits: [],
      seasons: [],
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
    expect(prizes.setDistribution).toHaveBeenCalledWith("cup", [
      { ...prizeEntry, sourceUrl: source },
    ]);
    expect(approved).toMatchObject({ status: "applied", entityId: "cup" });
  });

  it("applies a prize row correction with the proposal's source", async () => {
    const { id } = await service.propose(
      { kind: "update_tournament_prize", tournamentId: "cup", teamId: "kc", patch: {} },
      source,
      "journalist",
    );

    const approved = await service.approve(id, "admin");

    expect(staff.permissions).toEqual(["tournaments.manage"]);
    expect(prizes.updateEntry).toHaveBeenCalledWith("cup", "kc", {}, source);
    expect(approved).toMatchObject({ status: "applied", entityId: "cup" });
  });

  it("refuses a prize row correction for a team without a prize", async () => {
    await expect(
      service.propose(
        { kind: "update_tournament_prize", tournamentId: "cup", teamId: "zen", patch: {} },
        source,
        "journalist",
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("refuses a BLAST.tv or Liquipedia mirror source for any proposal", async () => {
    for (const sourceUrl of ["https://blast.tv/rl/open", "https://liquipedia-mirror.example/x"])
      await expect(
        service.propose(
          { kind: "update_tournament_prize", tournamentId: "cup", teamId: "kc", patch: {} },
          sourceUrl,
          "journalist",
        ),
      ).rejects.toThrow(InvalidInputError);
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

  describe("deletions", () => {
    const deleteMatch = (matchId: string) =>
      service.propose(
        { kind: "delete_match", matchId, reason: "Series imported twice" },
        "",
        "journalist",
      );

    const deleteTeam = (teamId: string, mergeIntoTeamId?: string) =>
      service.propose(
        { kind: "delete_team", teamId, reason: "Empty duplicate", mergeIntoTeamId },
        "",
        "journalist",
      );

    it("records a pending match deletion without deleting anything", async () => {
      const proposal = await deleteMatch("dup-match");

      expect(proposal).toMatchObject({ status: "pending", sourceUrl: "" });
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

      expect(staff.permissions).toEqual(["tournaments.manage"]);
      expect(matches.deleteMatch).toHaveBeenCalledExactlyOnceWith("dup-match");
      expect(approved).toMatchObject({ status: "applied", entityId: "dup-match" });
    });

    it("keeps a match deletion pending when the guard refuses it at approval", async () => {
      const { id } = await deleteMatch("dup-match");
      matches.deleteMatch.mockRejectedValueOnce(new ConflictError("Final still has 2 comments"));

      await expect(service.approve(id, "admin")).rejects.toThrow(ConflictError);

      expect(saved.get(id)).toMatchObject({ status: "pending", entityId: null });
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

      expect(staff.permissions).toEqual(["teams.manage"]);
      expect(teams.delete).toHaveBeenCalledExactlyOnceWith("kc-copy");
      expect(approved).toMatchObject({ status: "applied", entityId: "kc-copy" });
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
      expect(approved).toMatchObject({ status: "applied", entityId: "kc" });
    });

    it("refuses to merge a team into itself or into a missing team", async () => {
      await expect(deleteTeam("kc-copy", "kc-copy")).rejects.toThrow("into itself");
      await expect(deleteTeam("kc-copy", "nope")).rejects.toThrow(NotFoundError);
    });
  });

  describe("stream proposals", () => {
    const list: StreamInput[] = [
      { url: "https://twitch.tv/rlesports", language: "en", kind: "official" },
      { url: "https://twitch.tv/kameto", language: "fr", kind: "costream" },
    ];

    const setMatchStreams = (sourceUrl: string, matchId = "match-1") =>
      service.propose(
        { kind: "set_match_streams", matchId, streams: list },
        sourceUrl,
        "journalist",
      );

    it("validates a stream list and keeps it pending until approval", async () => {
      const proposal = await setMatchStreams(source);

      expect(proposal).toMatchObject({ status: "pending", change: { streams: list } });
      expect(streams.requireProposable).toHaveBeenCalledWith(
        { kind: "match", id: "match-1" },
        list,
      );
      expect(streams.set).not.toHaveBeenCalled();
    });

    it("refuses an invalid list or a start.gg match before recording anything", async () => {
      await expect(
        service.propose(
          {
            kind: "set_tournament_streams",
            tournamentId: "stage-1",
            streams: [{ url: "http://twitch.tv/rl", language: "en", kind: "official" }],
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
        { kind: "set_event_streams", eventId: "event-1", streams: list },
        "https://www.start.gg/tournament/rl-open",
        "journalist",
      );

      expect(await service.approve(manual.id, "admin")).toMatchObject({ entityId: "match-1" });
      expect(await service.approve(startgg.id, "admin")).toMatchObject({ entityId: "event-1" });

      expect(streams.set).toHaveBeenNthCalledWith(
        1,
        { kind: "match", id: "match-1" },
        list,
        "manual",
      );
      expect(streams.set).toHaveBeenNthCalledWith(
        2,
        { kind: "event", id: "event-1" },
        list,
        "startgg",
      );
      const applied = await streams.set.mock.results[1]?.value;
      expect(applied.streams.map((stream: { source: string }) => stream.source)).toEqual([
        "startgg",
        "startgg",
      ]);
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

    const setLineups = (sourceUrl: string, matchId = "match-1") =>
      service.propose(
        { kind: "set_match_lineups", matchId, lineups: sides },
        sourceUrl,
        "journalist",
      );

    it("validates the lineups and keeps them pending until approval", async () => {
      const proposal = await setLineups(source);

      expect(proposal).toMatchObject({ status: "pending", sourceUrl: source });
      expect(lineups.requireProposable).toHaveBeenCalledExactlyOnceWith("match-1", sides);
      expect(players.findById).toHaveBeenCalledWith("zen");
      expect(lineups.set).not.toHaveBeenCalled();
    });

    it("replaces the match lineups on approval", async () => {
      const { id } = await setLineups(source);

      const approved = await service.approve(id, "admin");

      expect(lineups.set).toHaveBeenCalledExactlyOnceWith("match-1", sides);
      expect(approved).toMatchObject({ status: "applied", entityId: "match-1" });
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
            matchId: "match-1",
            lineups: [{ participantId: "part-kc", playerIds: ["ghost"] }],
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
      peakViewers: 52_000,
      averageViewers: 31_000,
      scope: "official",
      measuredAt: null,
      sourceName: "Esports Charts",
      sourceUrl: "https://escharts.com/tournaments/rl/fake-open",
    };

    it("keeps a credited viewership pending until a staff member approves it", async () => {
      const proposal = await service.propose(
        { kind: "set_match_viewership", matchId: "match-1", viewership },
        viewership.sourceUrl,
        "journalist",
      );

      expect(proposal).toMatchObject({ status: "pending", change: { viewership } });
      expect(viewerships.requireProposable).toHaveBeenCalledWith(
        { kind: "match", id: "match-1" },
        viewership,
      );
      expect(viewerships.set).not.toHaveBeenCalled();

      expect(await service.approve(proposal.id, "admin")).toMatchObject({ entityId: "match-1" });
      expect(viewerships.set).toHaveBeenCalledExactlyOnceWith(
        { kind: "match", id: "match-1" },
        viewership,
      );
    });

    it("refuses a missing credit or a start.gg match before recording anything", async () => {
      await expect(
        service.propose(
          {
            kind: "set_event_viewership",
            eventId: "event-1",
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
        { kind: "set_event_viewership", eventId: "event-1", viewership },
        viewership.sourceUrl,
        "journalist",
      );
      await service.list("pending");
      expect(store.names).toHaveBeenCalledWith(expect.objectContaining({ events: ["event-1"] }));
    });
  });

  describe("circuit scale proposals", () => {
    const scale: CircuitScaleTier[] = [{ from: 1, to: 1, points: 10 }];
    const rules = "https://example.org/official-rules";

    const setScale = (tournamentId = "ps-stage") =>
      service.propose(
        { kind: "set_circuit_stage_scale", circuitId: "circuit-1", tournamentId, scale },
        rules,
        "journalist",
      );

    const input = { scale, sourceUrl: rules };

    it("checks the stage and keeps the scale pending until approval", async () => {
      const proposal = await setScale();

      expect(proposal).toMatchObject({ status: "pending", sourceUrl: rules });
      expect(circuits.requireStageSettings).toHaveBeenCalledWith("circuit-1", "ps-stage", input);
      expect(circuits.setStageScale).not.toHaveBeenCalled();
    });

    it("refuses a missing stage before recording anything", async () => {
      await expect(setScale("missing-stage")).rejects.toThrow(NotFoundError);
      expect(saved.size).toBe(0);
    });

    it("applies the scale with the proposal source on approval", async () => {
      const { id } = await setScale();

      expect(await service.approve(id, "admin")).toMatchObject({ entityId: "circuit-1" });
      expect(circuits.setStageScale).toHaveBeenCalledWith("circuit-1", "ps-stage", input);
      expect(staff.permissions).toContain("tournaments.manage");
    });

    it("carries the region teams and final placements, which must be known teams", async () => {
      const change = {
        kind: "set_circuit_stage_scale" as const,
        circuitId: "circuit-1",
        tournamentId: "major",
        scale,
        worldwide: true,
        regionTeamIds: ["kc"],
        finishes: [{ teamId: "kc", placement: 13 }],
      };

      const { id } = await service.propose(change, rules, "journalist");

      await service.approve(id, "admin");
      expect(circuits.setStageScale).toHaveBeenCalledWith("circuit-1", "major", {
        scale,
        sourceUrl: rules,
        worldwide: true,
        regionTeamIds: ["kc"],
        finishes: [{ teamId: "kc", placement: 13 }],
      });
      await expect(
        service.propose({ ...change, regionTeamIds: ["missing-team"] }, rules, "journalist"),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("team aliases", () => {
    const alias = {
      name: "Fixture Esports",
      from: "2023-01-01",
      to: "2024-06-01",
      logoUrl: null,
      pandascoreId: null,
    };

    it("checks the alias with the proposal source and keeps it pending", async () => {
      const proposal = await service.propose(
        { kind: "add_team_alias", teamId: "kc", alias },
        source,
        "journalist",
      );

      expect(proposal).toMatchObject({ status: "pending", sourceUrl: source });
      expect(teamAliases.requireProposable).toHaveBeenCalledWith("kc", {
        ...alias,
        sourceUrl: source,
      });
      expect(teamAliases.add).not.toHaveBeenCalled();
    });

    it("refuses a Liquipedia source and an unknown team before recording anything", async () => {
      await expect(
        service.propose(
          { kind: "add_team_alias", teamId: "kc", alias },
          "https://liquipedia.net/rocketleague/Karmine_Corp",
          "journalist",
        ),
      ).rejects.toThrow("Liquipedia");
      await expect(
        service.propose({ kind: "add_team_alias", teamId: "nope", alias }, source, "journalist"),
      ).rejects.toThrow(NotFoundError);
      expect(saved.size).toBe(0);
    });

    it("adds or updates the alias with the proposal source once a team manager approves", async () => {
      const added = await service.propose(
        { kind: "add_team_alias", teamId: "kc", alias },
        source,
        "journalist",
      );

      const updated = await service.propose(
        { kind: "update_team_alias", teamId: "kc", aliasId: "alias-1", alias },
        source,
        "journalist",
      );

      expect(await service.approve(added.id, "admin")).toMatchObject({ entityId: "kc" });
      expect(await service.approve(updated.id, "admin")).toMatchObject({ entityId: "kc" });
      expect(teamAliases.add).toHaveBeenCalledWith("kc", { ...alias, sourceUrl: source });
      expect(teamAliases.update).toHaveBeenCalledWith("kc", "alias-1", {
        ...alias,
        sourceUrl: source,
      });
      expect(teams.update).not.toHaveBeenCalled();
      expect(merges.mergeTeams).not.toHaveBeenCalled();
      expect(staff.permissions).toEqual(["teams.manage", "teams.manage"]);
    });
  });
});
