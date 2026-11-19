import { describe, expect, it } from "vitest";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { FakeStatsCandidates } from "./fake-stats-candidates.test-utils";
import { InMemoryPlayerLinks } from "./in-memory-player-links.test-utils";
import { StatsPlayerLinkService } from "./stats-player-link.service";

const link = { platform: "steam", platformId: "76561198224723032", playerId: "kofyr" };

const setup = () => {
  const links = new InMemoryPlayerLinks(
    [{ participantId: "p1", players: [{ id: "kofyr", name: "kofyr" }], teamName: "KC" }],
    3,
  );

  return { links, service: new StatsPlayerLinkService(new FakeStatsCandidates(() => []), links) };
};

describe(StatsPlayerLinkService, () => {
  it("links a tournament roster player and reports the rows repointed", async () => {
    const { service, links } = setup();

    await expect(service.link("t1", link)).resolves.toBe(3);
    expect(links.linked).toStrictEqual([link]);
  });

  it("rejects a player outside the tournament rosters without writing", async () => {
    const { service, links } = setup();

    await expect(service.link("t1", { ...link, playerId: "stranger" })).rejects.toBeInstanceOf(
      InvalidInputError,
    );
    expect(links.linked).toStrictEqual([]);
  });

  it("rejects an unknown tournament", async () => {
    const { service } = setup();

    await expect(service.link("missing", link)).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.accounts("missing")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("lists the tournament's accounts with every roster of the tournament", async () => {
    const { service } = setup();

    await expect(service.accounts("t1")).resolves.toStrictEqual({
      players: [],
      rosters: [{ participantId: "p1", players: [{ id: "kofyr", name: "kofyr" }], teamName: "KC" }],
    });
  });
});
