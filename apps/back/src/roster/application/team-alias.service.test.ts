import type { TeamAliasInput } from "@sarpbc/types";
import { describe, expect, it, vi } from "vitest";
import { ConflictError, InvalidInputError, NotFoundError } from "../../common/domain/errors";
import { Team } from "../domain/roster";
import { TeamAlias } from "../domain/team-alias";
import type { TeamAliasTransaction } from "./ports";
import { TeamAliasService } from "./team-alias.service";

const INPUT: TeamAliasInput = {
  name: " Fixture Origins ",
  from: "2020-01-01",
  to: "2022-06-01",
  sourceUrl: "https://www.rlesports.com/news/fixture-rebrand",
  logoUrl: null,
  pandascoreId: null,
};

function setup(owner: string | null = null) {
  const team = Object.assign(new Team(), {
    id: "team",
    name: "Fixture Now",
    aliases: [
      Object.assign(new TeamAlias(), {
        id: "a1",
        name: "Fixture Sponsored",
        from: "2022-06-01",
        to: null,
        sourceUrl: "https://x.com/fixture/status/2",
      }),
    ],
  });

  const merged = Object.assign(new Team(), { id: "merged", name: "Old", mergedIntoId: "team" });

  const aliases = {
    pandascoreOwner: vi.fn(async () => owner),
    save: vi.fn(async (_teamId: string, alias: TeamAlias) => {
      alias.id ||= "new-alias";
    }),
    delete: vi.fn(async () => undefined),
  };

  const known = new Map([team, merged].map((entry) => [entry.id, entry]));
  const teams = { findById: vi.fn(async (id: string) => known.get(id) ?? null) };
  const transaction: TeamAliasTransaction = { run: (work) => work({ teams, aliases }) };

  return { aliases, service: new TeamAliasService(transaction) };
}

describe("TeamAliasService", () => {
  it("stores a sourced alias with its trimmed name", async () => {
    const { aliases, service } = setup();

    const alias = await service.add("team", INPUT);

    expect(alias).toMatchObject({ id: "new-alias", name: "Fixture Origins", to: "2022-06-01" });
    expect(aliases.save).toHaveBeenCalledWith("team", alias);
  });

  it("refuses Liquipedia, overlapping periods, unknown and merged teams", async () => {
    const { aliases, service } = setup();

    await expect(
      service.add("team", { ...INPUT, sourceUrl: "https://liquipedia.net/rocketleague/Fixture" }),
    ).rejects.toThrow(InvalidInputError);
    await expect(service.add("team", { ...INPUT, to: null })).rejects.toThrow("overlaps");
    await expect(service.add("missing", INPUT)).rejects.toThrow(NotFoundError);
    await expect(service.add("merged", INPUT)).rejects.toThrow("was merged");
    expect(aliases.save).not.toHaveBeenCalled();
  });

  it("refuses a PandaScore id another team already answers to", async () => {
    const { aliases, service } = setup("Someone Else");

    await expect(service.add("team", { ...INPUT, pandascoreId: 99 })).rejects.toThrow(
      ConflictError,
    );
    expect(aliases.pandascoreOwner).toHaveBeenCalledWith(99, "");
  });

  it("updates and deletes only an alias of the team", async () => {
    const { aliases, service } = setup();

    const updated = await service.update("team", "a1", {
      ...INPUT,
      name: "Fixture Sponsored",
      from: "2022-07-01",
      to: null,
    });

    await service.delete("team", "a1");

    expect(updated).toMatchObject({ id: "a1", from: "2022-07-01" });
    expect(aliases.delete).toHaveBeenCalledWith(expect.objectContaining({ id: "a1" }));
    await expect(service.update("team", "other", INPUT)).rejects.toThrow(NotFoundError);
  });

  it("validates a proposal without writing", async () => {
    const { aliases, service } = setup();

    await service.requireProposable("team", INPUT);

    expect(aliases.save).not.toHaveBeenCalled();
  });
});
