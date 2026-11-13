import { describe, expect, it, vi } from "vitest";
import type {
  CircuitDetail,
  CircuitStandings,
  CircuitSummary,
  RosterChange,
  StaffRole,
} from "@sarpbc/types";
import { z } from "zod";
import { circuitTools } from "./circuit-tools";
import { rosterTools } from "./roster-tools";

const CIRCUIT_ID = "5d1f2a3b-4c5d-4e6f-8a7b-9c0d1e2f3a4b";
const TOURNAMENT_ID = "0b6e3d8a-1f2c-4e5d-8a9b-7c6d5e4f3a2b";
const SOURCE = "https://example.com/fake-circuit/rules";
const SCALE = [
  { from: 1, to: 1, points: 10 },
  { from: 2, to: 4, points: 5 },
];
const user = (role: StaffRole) => ({ id: "u1", email: "staff@test.com", role });

function scaleTool() {
  const rosterProposalService = {
    propose: vi.fn().mockImplementation(async (change: RosterChange) => ({
      id: "proposal-1",
      status: "pending",
      change,
    })),
    proposeTeamLogo: vi.fn(),
    list: vi.fn(),
  };
  const tool = rosterTools({ rosterProposalService }).find(
    (candidate) => candidate.name === "set_circuit_stage_scale",
  );
  if (!tool) throw new Error("set_circuit_stage_scale is not defined");
  return { rosterProposalService, tool };
}

function parsed(result: { content: { type: string; text?: string }[] }) {
  const block = result.content[0];
  return JSON.parse(block?.type === "text" && block.text ? block.text : "null");
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
    expect(parsed(result)).toMatchObject({ kind: "set_circuit_stage_scale", status: "pending" });
  });

  it("requires a non-Liquipedia sourceUrl and whole-number tiers", () => {
    const schema = z.object(scaleTool().tool.inputSchema);
    const accepts = (overrides: Partial<Record<keyof typeof input, string | typeof SCALE>>) =>
      schema.safeParse({ ...input, ...overrides }).success;

    expect(accepts({})).toBe(true);
    expect(accepts({ sourceUrl: undefined })).toBe(false);
    expect(accepts({ sourceUrl: "https://liquipedia.net/rocketleague/Fake" })).toBe(false);
    expect(accepts({ scale: [{ from: 0, to: 1, points: 3 }] })).toBe(false);
    expect(accepts({ scale: [{ from: 1, to: 1, points: 2.5 }] })).toBe(false);
  });

  it("requires tournaments.manage", async () => {
    const { tool, rosterProposalService } = scaleTool();
    const result = await tool.run(user("journalist"), input);

    expect(result.isError).toBe(true);
    expect(rosterProposalService.propose).not.toHaveBeenCalled();
  });
});

describe("get_circuit", () => {
  it("keeps start.gg stages out of the MCP response", async () => {
    vi.stubEnv("FRONT_URL", "https://sarpbc.test");
    const stage = (id: string, source: "pandascore" | "startgg") => ({
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
      stages: [stage("ps", "pandascore"), stage("sgg", "startgg")],
    };
    const standings: CircuitStandings = { ...summary, sourceUrls: [], events: [], rows: [] };
    const tool = circuitTools({
      circuitService: {
        list: vi.fn(),
        detail: vi.fn(async () => detail),
        standings: vi.fn(async () => standings),
        create: vi.fn(),
        update: vi.fn(),
      },
    }).find((candidate) => candidate.name === "get_circuit");
    if (!tool) throw new Error("get_circuit is not defined");

    const body = parsed(await tool.run(user("journalist"), { idOrSlug: "season" }));

    expect(body.stages.map((s: { tournament: { id: string } }) => s.tournament.id)).toEqual(["ps"]);
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

  function tools() {
    vi.stubEnv("FRONT_URL", "https://sarpbc.test");
    const circuitService = {
      list: vi.fn(),
      detail: vi.fn(),
      standings: vi.fn(),
      create: vi.fn(async () => circuit),
      update: vi.fn(async () => circuit),
    };
    const all = circuitTools({ circuitService });
    const named = (name: string) => {
      const tool = all.find((candidate) => candidate.name === name);
      if (!tool) throw new Error(`${name} is not defined`);
      return tool;
    };
    return { circuitService, create: named("create_circuit"), update: named("update_circuit") };
  }

  const input = {
    name: "RLCS 2026",
    slug: "season-2026",
    season: 2026,
    region: "Worldwide",
    sourceUrl: SOURCE,
  };

  it("creates the circuit directly and returns it with its public URL", async () => {
    const { create, circuitService } = tools();

    const body = parsed(await create.run(user("admin"), input));

    expect(circuitService.create).toHaveBeenCalledExactlyOnceWith(input);
    expect(body).toMatchObject({
      id: CIRCUIT_ID,
      slug: "season-2026",
      url: "https://sarpbc.test/circuits/season-2026",
    });
  });

  it("requires a slug, a season and a non-Liquipedia sourceUrl", () => {
    const schema = z.object(tools().create.inputSchema);
    const accepts = (overrides: Record<string, string | number | undefined>) =>
      schema.safeParse({ ...input, ...overrides }).success;

    expect(accepts({})).toBe(true);
    expect(accepts({ region: undefined })).toBe(true);
    expect(accepts({ slug: undefined })).toBe(false);
    expect(accepts({ season: undefined })).toBe(false);
    expect(accepts({ season: 2026.5 })).toBe(false);
    expect(accepts({ sourceUrl: undefined })).toBe(false);
    expect(accepts({ sourceUrl: "https://liquipedia.net/rocketleague/RLCS/2026" })).toBe(false);
    expect(accepts({ sourceUrl: "https://www.liquipedia.org/mirror" })).toBe(false);
  });

  it("updates by id or slug and refuses an empty update", async () => {
    const { update, circuitService } = tools();

    parsed(await update.run(user("admin"), { idOrSlug: "season-2026", region: null }));
    expect(circuitService.update).toHaveBeenCalledExactlyOnceWith("season-2026", {
      region: null,
    });

    const empty = await update.run(user("admin"), { idOrSlug: "season-2026" });
    expect(empty.isError).toBe(true);
    expect(circuitService.update).toHaveBeenCalledOnce();
  });

  it("requires tournaments.manage", async () => {
    const { create, update, circuitService } = tools();

    expect((await create.run(user("journalist"), input)).isError).toBe(true);
    expect((await update.run(user("journalist"), { idOrSlug: "x", name: "y" })).isError).toBe(true);
    expect(circuitService.create).not.toHaveBeenCalled();
    expect(circuitService.update).not.toHaveBeenCalled();
  });
});
