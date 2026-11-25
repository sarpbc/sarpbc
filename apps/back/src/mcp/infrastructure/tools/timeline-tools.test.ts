import { describe, expect, it } from "vitest";
import type { StaffRole, StaffTimelineEntry, TimelineEntryInput } from "@sarpbc/types";
import { z } from "zod";
import { jsonOf } from "../../../../test/mcp-result";
import type { TimelineService } from "../../../timeline/application/timeline.service";
import { timelineTools } from "./timeline-tools";

const ENTRY_ID = "5d1f2a3b-4c5d-4e6f-8a7b-9c0d1e2f3a4b";

const input: TimelineEntryInput = {
  date: "2023-09-06",
  kind: "patch",
  nameEn: "Season 8 begins",
  nameFr: "Début de la saison 8",
  noteEn: "Ranked rewards are reset.",
  noteFr: "Les récompenses classées sont réinitialisées.",
  sourceUrl: "https://example.com/fake-timeline/season-8",
};

const entry: StaffTimelineEntry = { ...input, id: ENTRY_ID };

class FakeTimelineService implements Pick<TimelineService, "list" | "create" | "update"> {
  readonly created: TimelineEntryInput[] = [];
  readonly updated: { id: string; changes: Partial<TimelineEntryInput> }[] = [];

  async list() {
    return [entry];
  }

  async create(created: TimelineEntryInput) {
    this.created.push(created);

    return entry;
  }

  async update(id: string, changes: Partial<TimelineEntryInput>) {
    this.updated.push({ changes, id });

    return entry;
  }
}

const user = (role: StaffRole) => ({ email: "staff@test.com", id: "u1", role });

const tools = () => {
  const timelineService = new FakeTimelineService();
  const all = timelineTools({ timelineService });

  const named = (name: string) => {
    const tool = all.find((candidate) => candidate.name === name);

    if (!tool) {
      throw new Error(`${name} is not defined`);
    }

    return tool;
  };

  return {
    create: named("create_timeline_entry"),
    list: named("list_timeline_entries"),
    timelineService,
    update: named("update_timeline_entry"),
  };
};

describe("timeline tools", () => {
  it("lists the entries with their ids", async () => {
    const { list } = tools();

    expect(jsonOf(await list.run(user("admin"), {}))).toStrictEqual([entry]);
  });

  it("creates an entry directly and returns it", async () => {
    const { create, timelineService } = tools();

    const body = jsonOf(await create.run(user("admin"), { ...input }));

    expect(timelineService.created).toStrictEqual([input]);
    expect(body).toMatchObject({ id: ENTRY_ID, kind: "patch" });
  });

  it.each<[string, Record<string, string | undefined>, boolean]>([
    ["the complete input", {}, true],
    ["a missing source", { sourceUrl: undefined }, false],
    ["a Liquipedia source", { sourceUrl: "https://liquipedia.net/rocketleague/RLCS" }, false],
    ["a BLAST.tv source", { sourceUrl: "https://blast.tv/rl/news" }, false],
    ["a date that is not a calendar date", { date: "2023-02-30" }, false],
    ["an unknown kind", { kind: "season" }, false],
    ["a missing French note", { noteFr: undefined }, false],
    ["a name over 80 characters", { nameEn: "x".repeat(81) }, false],
  ])("validates %s", (_label, overrides, accepted) => {
    const schema = z.object(tools().create.inputSchema);

    expect(schema.safeParse({ ...input, ...overrides }).success).toBe(accepted);
  });

  it("updates only the given fields and refuses an empty update", async () => {
    const { update, timelineService } = tools();

    await update.run(user("admin"), { id: ENTRY_ID, kind: "format" });
    expect(timelineService.updated).toStrictEqual([{ changes: { kind: "format" }, id: ENTRY_ID }]);

    const empty = await update.run(user("admin"), { id: ENTRY_ID });
    expect(empty.isError).toBe(true);
    expect(timelineService.updated).toHaveLength(1);
  });

  it("requires tournaments.manage", async () => {
    const { create, list, update, timelineService } = tools();

    const results = [
      await list.run(user("journalist"), {}),
      await create.run(user("journalist"), { ...input }),
      await update.run(user("journalist"), { id: ENTRY_ID, kind: "format" }),
    ];

    expect(results.map((result) => result.isError)).toStrictEqual([true, true, true]);
    expect(timelineService.created).toStrictEqual([]);
    expect(timelineService.updated).toStrictEqual([]);
  });
});
