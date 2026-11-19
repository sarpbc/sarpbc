import type { TeamAliasInput } from "@sarpbc/types";
import { describe, expect, it, vi } from "vitest";
import { ConflictError } from "../../common/domain/errors/conflict-error";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { Team } from "../domain/team";
import { TeamAlias } from "../domain/team-alias";
import type { TeamAliasTransaction, TeamAliasWriter } from "./ports";
import { TeamAliasService } from "./team-alias.service";

const INPUT: TeamAliasInput = {
  from: "2020-01-01",
  logoUrl: null,
  name: " Fixture Origins ",
  pandascoreId: null,
  sourceUrl: "https://www.rlesports.com/news/fixture-rebrand",
  to: "2022-06-01",
};

const setup = (owner: string | null = null) => {
  const team = Object.assign(new Team(), {
    aliases: [
      Object.assign(new TeamAlias(), {
        from: "2022-06-01",
        id: "a1",
        name: "Fixture Sponsored",
        sourceUrl: "https://x.com/fixture/status/2",
        to: null,
      }),
    ],
    id: "team",
    name: "Fixture Now",
  });

  const merged = Object.assign(new Team(), { id: "merged", mergedIntoId: "team", name: "Old" });

  const aliases: TeamAliasWriter = {
    delete: async () => {},
    pandascoreOwner: async () => owner,
    save: async (_teamId, alias) => {
      alias.id ||= "new-alias";
    },
  };

  vi.spyOn(aliases, "delete");
  vi.spyOn(aliases, "save");

  const known = new Map([team, merged].map((entry) => [entry.id, entry]));

  const teams = {
    findById: async (id: string) => known.get(id) ?? null,
  };

  const transaction: TeamAliasTransaction = { run: async (work) => await work({ aliases, teams }) };

  return { aliases, service: new TeamAliasService(transaction) };
};

describe(TeamAliasService, () => {
  it("stores a sourced alias with its trimmed name", async () => {
    const { aliases, service } = setup();

    const alias = await service.add("team", INPUT);

    expect(alias).toMatchObject({ id: "new-alias", name: "Fixture Origins", to: "2022-06-01" });
    expect(aliases.save).toHaveBeenCalledExactlyOnceWith("team", alias);
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
    const { service } = setup("Someone Else");

    await expect(service.add("team", { ...INPUT, pandascoreId: 99 })).rejects.toThrow(
      ConflictError,
    );
  });

  it("updates and deletes only an alias of the team", async () => {
    const { aliases, service } = setup();

    const updated = await service.update("team", "a1", {
      ...INPUT,
      from: "2022-07-01",
      name: "Fixture Sponsored",
      to: null,
    });

    await service.delete("team", "a1");

    expect(updated).toMatchObject({ from: "2022-07-01", id: "a1" });
    expect(aliases.delete).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: "a1" }));
    await expect(service.update("team", "other", INPUT)).rejects.toThrow(NotFoundError);
  });

  it("validates a proposal without writing", async () => {
    const { aliases, service } = setup();

    await service.requireProposable("team", INPUT);

    expect(aliases.save).not.toHaveBeenCalled();
  });
});
