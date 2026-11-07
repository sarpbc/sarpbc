import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, InvalidInputError, NotFoundError } from "../../common/domain/errors";
import { Tournament, TournamentParticipant } from "../domain/competition";
import { TournamentEvent } from "../domain/tournament-event";
import type { ContractRole } from "@sarpbc/types";
import { Player, Team } from "../../roster/domain/roster";
import { CompetitionAfterCommit } from "./after-commit";
import { ManualTournamentService } from "./manual-tournament.service";
import type { UpdateTournamentInput } from "./inputs";
describe("ManualTournamentService", () => {
  const writer = {
    load: vi.fn(),
    save: vi.fn(),
    participants: vi.fn(),
    teamsExist: vi.fn(),
    participantReferences: vi.fn(),
    removeParticipant: vi.fn(),
    saveParticipant: vi.fn(),
    league: vi.fn(),
    playersExist: vi.fn(),
    teamPlayers: vi.fn(),
  };
  const stored = new Map<string, TournamentEvent>();
  const eventWriter = {
    load: vi.fn(async (id: string) => {
      const event = stored.get(id);
      return event ? Object.assign(new TournamentEvent(), event) : null;
    }),
    slugTaken: vi.fn(async (slug: string, except: string | null) =>
      [...stored.values()].some((event) => event.slug === slug && event.id !== except),
    ),
    save: vi.fn(async (event: TournamentEvent) => {
      stored.set(event.id, Object.assign(new TournamentEvent(), event));
    }),
    stages: vi.fn(async (eventId: string) =>
      tournament.event.id === eventId
        ? [{ id: tournament.id, name: tournament.name, source: tournament.source }]
        : [],
    ),
    stageSlugTaken: vi.fn(async (_event: string, _slug: string) => false),
  };
  const cache = { invalidateTournament: vi.fn() },
    diagnostics = { error: vi.fn(), warn: vi.fn() },
    reads = { findById: vi.fn(), leagues: vi.fn() };
  let tournament: Tournament;
  const events: string[] = [];
  const tx = {
    run: async <T>(work: (scope: never) => Promise<T>) => {
      const result = await work({ tournaments: writer, events: eventWriter } as never);
      events.push("commit");
      return result;
    },
  };
  const service = new ManualTournamentService(
    reads as never,
    tx,
    new CompetitionAfterCommit(cache, { publish: vi.fn() }, diagnostics),
  );
  beforeEach(() => {
    vi.clearAllMocks();
    events.length = 0;
    stored.clear();
    const event = Object.assign(new TournamentEvent(), {
      id: "event",
      slug: "ewc-2026",
      name: "EWC",
    });
    stored.set(event.id, event);
    tournament = Object.assign(new Tournament(), {
      id: "ewc",
      source: "pandascore",
      pandascoreId: 123,
      name: "Group A",
      slug: "group-a",
      event: { id: "event", slug: "ewc-2026", name: "EWC" },
      imageUrl: "https://cdn.example/old.png",
    });
    writer.load.mockImplementation(async () => tournament);
    reads.findById.mockImplementation(async () => tournament);
    writer.save.mockResolvedValue(undefined);
    cache.invalidateTournament.mockImplementation(async () => {
      events.push("invalidate");
    });
    writer.participants.mockResolvedValue([]);
    writer.teamsExist.mockResolvedValue(true);
    writer.playersExist.mockResolvedValue(true);
    writer.teamPlayers.mockResolvedValue([]);
  });
  const member = (id: string, contractRole: ContractRole | null, role: string | null = null) =>
    Object.assign(new Player(), {
      id,
      team: Object.assign(new Team(), { id: "vitality" }),
      contractRole,
      role,
    });
  it("snapshots the active players of a team joining a manual tournament", async () => {
    tournament.source = "manual";
    writer.teamPlayers.mockResolvedValue([
      member("diaz", "active"),
      member("legacy", null),
      member("sub", "benched"),
      member("coach", "coach"),
      member("ps-coach", null, "Coach"),
    ]);
    await service.update("ewc", { teamIds: ["vitality"] });
    expect(writer.teamPlayers).toHaveBeenCalledWith("vitality");
    expect(writer.saveParticipant).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: "vitality", playerIds: ["diaz", "legacy"] }),
    );
  });
  it("keeps the roster of a team that is already participating", async () => {
    tournament.source = "manual";
    const team = Object.assign(new Team(), { id: "vitality" });
    writer.participants.mockResolvedValue([
      Object.assign(new TournamentParticipant(), { id: "p", team }),
    ]);
    await service.update("ewc", { teamIds: ["vitality"] });
    expect(writer.teamPlayers).not.toHaveBeenCalled();
    expect(writer.saveParticipant).not.toHaveBeenCalled();
  });
  it("replaces the roster of listed participants only", async () => {
    tournament.source = "manual";
    const team = Object.assign(new Team(), { id: "ikkaku" });
    writer.participants.mockResolvedValue([
      Object.assign(new TournamentParticipant(), { id: "p", team }),
    ]);
    await service.update("ewc", {
      rosters: [{ teamId: "ikkaku", playerIds: ["exotiik", "rezears", "yujin"] }],
    });
    expect(writer.playersExist).toHaveBeenCalledWith(["exotiik", "rezears", "yujin"]);
    expect(writer.saveParticipant).toHaveBeenCalledExactlyOnceWith({
      id: "p",
      tournamentId: "ewc",
      teamId: "ikkaku",
      playerIds: ["exotiik", "rezears", "yujin"],
    });
  });
  it("rejects a roster for a team that is not participating", async () => {
    tournament.source = "manual";
    await expect(
      service.update("ewc", { rosters: [{ teamId: "ikkaku", playerIds: [] }] }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    expect(writer.save).not.toHaveBeenCalled();
  });
  it("rejects a roster with unknown players", async () => {
    tournament.source = "manual";
    writer.playersExist.mockResolvedValue(false);
    await expect(
      service.update("ewc", { rosters: [{ teamId: "ikkaku", playerIds: ["ghost"] }] }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    expect(writer.saveParticipant).not.toHaveBeenCalled();
  });
  it("edits artwork and invalidates only after commit", async () => {
    const result = await service.update("ewc", { imageUrl: " https://cdn.example/ewc.png " });
    expect(result).toMatchObject({
      name: "Group A",
      source: "pandascore",
      pandascoreId: 123,
      imageUrl: "https://cdn.example/ewc.png",
    });
    expect(events).toEqual(["commit", "invalidate"]);
    expect(writer.league).not.toHaveBeenCalled();
  });
  it.each([null, ""])("clears synced artwork with %p", async (imageUrl) => {
    expect((await service.update("ewc", { imageUrl })).imageUrl).toBeNull();
  });
  it.each<UpdateTournamentInput>([
    { name: "Changed" },
    { slug: "changed" },
    { tier: null },
    { leagueId: null },
    { beginAt: null },
    { teamIds: [] },
    { rosters: [] },
    { eventId: "cdf" },
  ])("rejects PandaScore-owned fields %p", async (patch) => {
    await expect(service.update("ewc", { ...patch, imageUrl: null })).rejects.toBeInstanceOf(
      InvalidInputError,
    );
    expect(writer.save).not.toHaveBeenCalled();
    expect(cache.invalidateTournament).not.toHaveBeenCalled();
  });
  it("marks a synced end date as corrected until staff clear it", async () => {
    const corrected = await service.update("ewc", { endAt: "2025-03-02" });
    expect(corrected).toMatchObject({ endAt: new Date("2025-03-02"), endAtCorrected: true });
    const cleared = await service.update("ewc", { endAt: null });
    expect(cleared).toMatchObject({ endAt: null, endAtCorrected: false });
  });
  it("rejects an empty synced patch", async () => {
    await expect(service.update("ewc", {})).rejects.toBeInstanceOf(InvalidInputError);
  });
  function ownEvent() {
    tournament.source = "manual";
    stored.get("event")!.name = tournament.name;
  }
  it("allows manual details and artwork together and renames the event", async () => {
    ownEvent();
    expect(await service.update("ewc", { name: "Community Cup", imageUrl: null })).toMatchObject({
      name: "Community Cup",
      slug: "group-a",
      event: { slug: "ewc-2026", name: "Community Cup" },
      imageUrl: null,
    });
  });
  it("creates a single-stage event with a generated, deduplicated slug", async () => {
    stored.set(
      "taken",
      Object.assign(new TournamentEvent(), { id: "taken", slug: "community-cup" }),
    );
    writer.save.mockImplementation(async (saved: Tournament) => {
      tournament = saved;
    });
    const created = await service.create({ name: "Community Cup" });
    expect(created).toMatchObject({
      source: "manual",
      slug: "community-cup",
      event: { slug: "community-cup-2", name: "Community Cup" },
    });
    expect(stored.get(created.event.id)).toMatchObject({ slug: "community-cup-2" });
  });
  it("uses an explicit staff slug for the event and rejects one that is taken", async () => {
    writer.save.mockImplementation(async (saved: Tournament) => {
      tournament = saved;
    });
    expect(await service.create({ name: "Cup", slug: "My Cup" })).toMatchObject({
      event: { slug: "my-cup" },
    });
    await expect(service.create({ name: "Other", slug: "ewc-2026" })).rejects.toBeInstanceOf(
      ConflictError,
    );
  });
  it("edits the event slug of a manual tournament", async () => {
    ownEvent();
    stored.set("other", Object.assign(new TournamentEvent(), { id: "other", slug: "taken" }));
    expect(await service.update("ewc", { slug: "ewc-renamed" })).toMatchObject({
      event: { slug: "ewc-renamed" },
    });
    expect(await service.update("ewc", { slug: "ewc-renamed" })).toMatchObject({
      event: { slug: "ewc-renamed" },
    });
    await expect(service.update("ewc", { slug: "taken" })).rejects.toBeInstanceOf(ConflictError);
  });
  it.each(["???", "0b6f2d3e-6c1a-4b8e-9a51-2f7c3d4e5a6b"])(
    "rejects the unusable event slug %p",
    async (slug) => {
      ownEvent();
      await expect(service.update("ewc", { slug })).rejects.toBeInstanceOf(InvalidInputError);
    },
  );
  it("leaves a shared event alone when one of its stages changes", async () => {
    tournament.source = "manual";
    expect(await service.update("ewc", { name: "Finals", slug: "ewc-2026" })).toMatchObject({
      name: "Finals",
      event: { slug: "ewc-2026", name: "EWC" },
    });
    await expect(service.update("ewc", { slug: "finals" })).rejects.toBeInstanceOf(
      InvalidInputError,
    );
    expect(stored.get("event")).toMatchObject({ name: "EWC", slug: "ewc-2026" });
  });
  it("moves a manual tournament into another event under a slug free there", async () => {
    tournament.source = "manual";
    stored.set(
      "cdf",
      Object.assign(new TournamentEvent(), { id: "cdf", slug: "cdf-2026", name: "CDF" }),
    );
    eventWriter.stageSlugTaken.mockImplementationOnce(
      async (_event: string, slug: string) => slug === "group-a",
    );
    expect(await service.update("ewc", { eventId: "cdf" })).toMatchObject({
      slug: "group-a-2",
      event: { id: "cdf", slug: "cdf-2026", name: "CDF" },
    });
    expect(stored.get("event")).toMatchObject({ name: "EWC", slug: "ewc-2026" });
    await expect(service.update("ewc", { eventId: "event", slug: "x" })).rejects.toBeInstanceOf(
      InvalidInputError,
    );
    await expect(service.update("ewc", { eventId: "missing" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
  it("creates a tournament as a stage of an existing event", async () => {
    writer.save.mockImplementation(async (saved: Tournament) => {
      tournament = saved;
    });
    expect(await service.create({ name: "Finals", eventId: "event" })).toMatchObject({
      slug: "finals",
      event: { id: "event", slug: "ewc-2026", name: "EWC" },
    });
    expect([...stored.keys()]).toEqual(["event"]);
    await expect(
      service.create({ name: "Finals", eventId: "event", slug: "finals" }),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });
  it("preserves committed success when optional invalidation fails", async () => {
    cache.invalidateTournament.mockRejectedValue(new Error("Redis down"));
    expect((await service.update("ewc", { imageUrl: null })).imageUrl).toBeNull();
    expect(diagnostics.error).toHaveBeenCalled();
  });
  it.each(["tournamentWinner", "matchParticipant", "matchWinner", "results"])(
    "protects referenced participant %s",
    async (reference) => {
      tournament.source = "manual";
      const team = Object.assign(new Team(), { id: "old" });
      writer.participants.mockResolvedValue([
        Object.assign(new TournamentParticipant(), { id: "p", team }),
      ]);
      writer.participantReferences.mockResolvedValue({ [reference]: true });
      await expect(service.update("ewc", { teamIds: [] })).rejects.toBeInstanceOf(
        InvalidInputError,
      );
      expect(writer.removeParticipant).not.toHaveBeenCalled();
    },
  );
  it("rejects reversed dates", async () => {
    tournament.source = "manual";
    await expect(
      service.update("ewc", { beginAt: "2026-10-20", endAt: "2026-10-19" }),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });
});
