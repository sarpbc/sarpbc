import { describe, expect, it, vi } from "vitest";
import type { CircuitDetail, CircuitStandings, RosterChange, StaffRole } from "@sarpbc/types";
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
      description: null,
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
      },
    }).find((candidate) => candidate.name === "get_circuit");
    if (!tool) throw new Error("get_circuit is not defined");

    const body = parsed(await tool.run(user("journalist"), { idOrSlug: "season" }));

    expect(body.stages.map((s: { tournament: { id: string } }) => s.tournament.id)).toEqual(["ps"]);
  });
});
