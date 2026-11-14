import { describe, expect, it, vi } from "vitest";
import type { CircuitDetail, CircuitStandings, CircuitSummary, StaffRole } from "@sarpbc/types";
import { z } from "zod";
import type { CircuitService } from "../../../circuit/application/circuit.service";
import { circuitTools } from "./circuit-tools";
import { rosterTools } from "./roster-tools";
import { jsonOf, pendingProposalService } from "../../../../test/mcp-result";

const CIRCUIT_ID = "5d1f2a3b-4c5d-4e6f-8a7b-9c0d1e2f3a4b";
const TOURNAMENT_ID = "0b6e3d8a-1f2c-4e5d-8a9b-7c6d5e4f3a2b";
const TEAM_ID = "7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const SOURCE = "https://example.com/fake-circuit/rules";

const SCALE = [
  { from: 1, to: 1, points: 10 },
  { from: 2, to: 4, points: 5 },
];

const user = (role: StaffRole) => ({ id: "u1", email: "staff@test.com", role });

const scaleTool = () => {
  const rosterProposalService = pendingProposalService();

  const tool = rosterTools({ rosterProposalService }).find(
    (candidate) => candidate.name === "set_circuit_stage_scale",
  );

  if (!tool) {
    throw new Error("set_circuit_stage_scale is not defined");
  }

  return { rosterProposalService, tool };
};

interface ScaleInputOverrides {
  sourceUrl: string | undefined;
  scale: typeof SCALE;
  regionTeamIds: string[];
  finishes: { teamId: string; placement: number }[];
}

describe("set_circuit_stage_scale", () => {
  const input = {
    circuitId: CIRCUIT_ID,
    tournamentId: TOURNAMENT_ID,
    scale: SCALE,
    sourceUrl: SOURCE,
  };

  it("queues a proposal with its source instead of writing the scale", async () => {
    vi.stubEnv("ADMIN_URL", "https://admin.sarpbc.test");
    const { tool, rosterProposalService } = scaleTool();

    const result = await tool.run(user("admin"), input);

    expect(rosterProposalService.propose).toHaveBeenCalledExactlyOnceWith(
      {
        kind: "set_circuit_stage_scale",
        circuitId: CIRCUIT_ID,
        tournamentId: TOURNAMENT_ID,
        scale: SCALE,
      },
      SOURCE,
      "u1",
    );
    expect(jsonOf(result)).toMatchObject({ kind: "set_circuit_stage_scale", status: "pending" });
  });

  it("forwards the worldwide flag, the region teams and the final placements", async () => {
    const { tool, rosterProposalService } = scaleTool();

    const regional = {
      worldwide: true,
      regionTeamIds: [TEAM_ID],
      finishes: [{ teamId: TEAM_ID, placement: 13 }],
    };

    await tool.run(user("admin"), { ...input, ...regional });

    expect(rosterProposalService.propose).toHaveBeenCalledExactlyOnceWith(
      {
        kind: "set_circuit_stage_scale",
        circuitId: CIRCUIT_ID,
        tournamentId: TOURNAMENT_ID,
        scale: SCALE,
        ...regional,
      },
      SOURCE,
      "u1",
    );
  });

  it.each<[string, Partial<ScaleInputOverrides>, boolean]>([
    ["the complete input", {}, true],
    ["a missing sourceUrl", { sourceUrl: undefined }, false],
    ["a Liquipedia sourceUrl", { sourceUrl: "https://liquipedia.net/rocketleague/Fake" }, false],
    ["a BLAST.tv sourceUrl", { sourceUrl: "https://blast.tv/rl/leaderboard/2026" }, false],
    ["a region team that is not a UUID", { regionTeamIds: ["karmine-corp"] }, false],
    ["a placement below 1", { finishes: [{ teamId: TEAM_ID, placement: 0 }] }, false],
    ["a placement of 9", { finishes: [{ teamId: TEAM_ID, placement: 9 }] }, true],
    ["a tier starting below 1", { scale: [{ from: 0, to: 1, points: 3 }] }, false],
    ["fractional tier points", { scale: [{ from: 1, to: 1, points: 2.5 }] }, false],
  ])("validates %s", (_label, overrides, accepted) => {
    const schema = z.object(scaleTool().tool.inputSchema);

    expect(schema.safeParse({ ...input, ...overrides }).success).toBe(accepted);
  });

  it("requires tournaments.manage", async () => {
    const { tool, rosterProposalService } = scaleTool();
    const result = await tool.run(user("journalist"), input);

    expect(result.isError).toBe(true);
    expect(rosterProposalService.propose).not.toHaveBeenCalled();
  });
});

describe("get_circuit", () => {
  it("keeps start.gg stages, their region teams and their placements out of the MCP response", async () => {
    vi.stubEnv("FRONT_URL", "https://sarpbc.test");

    const team = {
      id: TEAM_ID,
      name: "Fake Team",
      slug: "fake-team",
      imageUrl: null,
      darkModeImageUrl: null,
    };

    const stage = (id: string, source: "pandascore" | "manual" | "startgg") => ({
      tournament: {
        id,
        name: id,
        slug: id,
        source,
        beginAt: null,
        endAt: null,
        event: { id: "e1", slug: "e1", name: "Event" },
      },
      scale: SCALE,
      sourceUrl: SOURCE,
      worldwide: true,
      regionTeams: [team],
      finishes: [{ team, placement: 13 }],
    });

    const summary = {
      id: CIRCUIT_ID,
      slug: "season",
      name: "Season",
      season: 2026,
      region: null,
      description: null,
      sourceUrl: SOURCE,
      qualificationSpots: null,
    };

    const detail: CircuitDetail = {
      ...summary,
      stages: [stage("ps", "pandascore"), stage("manual", "manual"), stage("sgg", "startgg")],
    };

    const standings: CircuitStandings = { ...summary, sourceUrls: [], events: [], rows: [] };

    const tool = circuitTools({
      circuitService: {
        list: vi.fn<CircuitService["list"]>(),
        detail: vi.fn<CircuitService["detail"]>(async () => detail),
        standings: vi.fn<CircuitService["standings"]>(async () => standings),
        create: vi.fn<CircuitService["create"]>(),
        update: vi.fn<CircuitService["update"]>(),
      },
    }).find((candidate) => candidate.name === "get_circuit");

    if (!tool) {
      throw new Error("get_circuit is not defined");
    }

    const body = jsonOf(await tool.run(user("journalist"), { idOrSlug: "season" }));

    expect(body).toMatchObject({
      stages: [{ tournament: { id: "ps" } }, { tournament: { id: "manual" } }],
    });
    expect(JSON.stringify(body)).not.toContain("sgg");
  });
});

describe("create_circuit and update_circuit", () => {
  const circuit: CircuitSummary = {
    id: CIRCUIT_ID,
    slug: "season-2026",
    name: "RLCS 2026",
    season: 2026,
    region: "Worldwide",
    description: null,
    sourceUrl: SOURCE,
    qualificationSpots: null,
  };

  const tools = () => {
    vi.stubEnv("FRONT_URL", "https://sarpbc.test");

    const circuitService = {
      list: vi.fn<CircuitService["list"]>(),
      detail: vi.fn<CircuitService["detail"]>(),
      standings: vi.fn<CircuitService["standings"]>(),
      create: vi.fn<CircuitService["create"]>(async () => circuit),
      update: vi.fn<CircuitService["update"]>(async () => circuit),
    };

    const all = circuitTools({ circuitService });

    const named = (name: string) => {
      const tool = all.find((candidate) => candidate.name === name);

      if (!tool) {
        throw new Error(`${name} is not defined`);
      }

      return tool;
    };

    return { circuitService, create: named("create_circuit"), update: named("update_circuit") };
  };

  const input = {
    name: "RLCS 2026",
    slug: "season-2026",
    season: 2026,
    region: "Worldwide",
    sourceUrl: SOURCE,
  };

  it("creates the circuit directly and returns it with its public URL", async () => {
    const { create, circuitService } = tools();

    const body = jsonOf(await create.run(user("admin"), input));

    expect(circuitService.create).toHaveBeenCalledExactlyOnceWith(input);
    expect(body).toMatchObject({
      id: CIRCUIT_ID,
      slug: "season-2026",
      url: "https://sarpbc.test/circuits/season-2026",
    });
  });

  it.each<[string, Record<string, string | number | undefined>, boolean]>([
    ["the complete input", {}, true],
    ["a missing region", { region: undefined }, true],
    ["a missing slug", { slug: undefined }, false],
    ["a missing season", { season: undefined }, false],
    ["a fractional season", { season: 2026.5 }, false],
    ["a missing sourceUrl", { sourceUrl: undefined }, false],
    [
      "a Liquipedia sourceUrl",
      { sourceUrl: "https://liquipedia.net/rocketleague/RLCS/2026" },
      false,
    ],
    ["a Liquipedia mirror sourceUrl", { sourceUrl: "https://www.liquipedia.org/mirror" }, false],
    [
      "a BLAST.tv sourceUrl",
      { sourceUrl: "https://blast.tv/rl/leaderboard/2026/world-championship/eu" },
      false,
    ],
  ])("validates %s", (_label, overrides, accepted) => {
    const schema = z.object(tools().create.inputSchema);

    expect(schema.safeParse({ ...input, ...overrides }).success).toBe(accepted);
  });

  it("updates by id or slug and refuses an empty update", async () => {
    const { update, circuitService } = tools();

    await update.run(user("admin"), { idOrSlug: "season-2026", region: null });
    expect(circuitService.update).toHaveBeenCalledExactlyOnceWith("season-2026", {
      region: null,
    });

    const empty = await update.run(user("admin"), { idOrSlug: "season-2026" });
    expect(empty.isError).toBe(true);
    expect(circuitService.update).toHaveBeenCalledOnce();
  });

  it("requires tournaments.manage", async () => {
    const { create, update, circuitService } = tools();

    const runResult = await create.run(user("journalist"), input);
    expect(runResult.isError).toBe(true);
    const runResult2 = await update.run(user("journalist"), { idOrSlug: "x", name: "y" });
    expect(runResult2.isError).toBe(true);
    expect(circuitService.create).not.toHaveBeenCalled();
    expect(circuitService.update).not.toHaveBeenCalled();
  });
});
